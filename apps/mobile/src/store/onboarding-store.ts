import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingSection, OnboardingState, TargetRegistration, OnboardingCompletionEvent } from '../onboarding/onboarding-types';
import { ONBOARDING_STEPS } from '../onboarding/onboarding-constants';

const getStorageKey = (userId: string) => `@streak_onboarding_state_${userId}`;

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  userId: null,
  currentStepId: null,
  currentSection: null,
  isActive: false,
  isCompleted: false,
  isDismissed: false,
  skippedSections: [],
  stepHistory: [],
  targets: {},
  activeModalLayer: null,

  startForUser: async (userId: string, hasHabits = false, hasRooms = false) => {
    if (!userId) return;

    try {
      const storageKey = getStorageKey(userId);
      const rawData = await AsyncStorage.getItem(storageKey);

      if (rawData) {
        const saved = JSON.parse(rawData);
        if (saved.isCompleted || saved.isDismissed) {
          set({
            userId,
            isActive: false,
            isCompleted: !!saved.isCompleted,
            isDismissed: !!saved.isDismissed,
            currentStepId: null,
            currentSection: null,
            stepHistory: [],
          });
          return;
        }

        const step = ONBOARDING_STEPS.find((s) => s.id === saved.currentStepId) || ONBOARDING_STEPS[0];
        set({
          userId,
          currentStepId: step.id,
          currentSection: step.section,
          isActive: true,
          isCompleted: false,
          isDismissed: false,
          startedAt: saved.startedAt || new Date().toISOString(),
          skippedSections: saved.skippedSections || [],
          stepHistory: saved.stepHistory || [],
        });
        return;
      }

      let initialStepId = 'today.lesson';
      if (hasHabits) {
        initialStepId = 'today.promise';
      }

      const initialStep = ONBOARDING_STEPS.find((s) => s.id === initialStepId) || ONBOARDING_STEPS[0];
      const nowIso = new Date().toISOString();

      set({
        userId,
        currentStepId: initialStep.id,
        currentSection: initialStep.section,
        isActive: true,
        isCompleted: false,
        isDismissed: false,
        startedAt: nowIso,
        skippedSections: [],
        stepHistory: [],
      });

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          userId,
          currentStepId: initialStep.id,
          currentSection: initialStep.section,
          isActive: true,
          isCompleted: false,
          isDismissed: false,
          startedAt: nowIso,
          skippedSections: [],
          stepHistory: [],
        })
      );
    } catch (e) {
      console.warn('Failed to start onboarding for user:', e);
    }
  },

  completeEvent: async (event: OnboardingCompletionEvent) => {
    const { currentStepId, userId, isActive, isCompleted, isDismissed, stepHistory } = get();
    if (!isActive || !currentStepId || isCompleted || isDismissed) return;

    const currentStep = ONBOARDING_STEPS.find((s) => s.id === currentStepId);
    if (!currentStep) return;

    const isMatchingEvent = currentStep.completionEvent === event;
    const isExplicitNext = event === 'NEXT_EXPLANATION' && (currentStep.stepType === 'EXPLANATION' || currentStep.stepType === 'OBSERVE');

    if (!isMatchingEvent && !isExplicitNext) {
      return;
    }

    const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStepId);
    if (currentIndex === -1 || currentIndex >= ONBOARDING_STEPS.length - 1) {
      get().complete();
      return;
    }

    let nextIndex = currentIndex + 1;
    while (nextIndex < ONBOARDING_STEPS.length && ONBOARDING_STEPS[nextIndex].isConditional) {
      nextIndex++;
    }

    if (nextIndex >= ONBOARDING_STEPS.length) {
      get().complete();
      return;
    }

    const nextStep = ONBOARDING_STEPS[nextIndex];
    const newHistory = [...stepHistory, currentStepId];

    set({
      currentStepId: nextStep.id,
      currentSection: nextStep.section,
      stepHistory: newHistory,
    });

    if (userId) {
      try {
        await AsyncStorage.setItem(
          getStorageKey(userId),
          JSON.stringify({
            userId,
            currentStepId: nextStep.id,
            currentSection: nextStep.section,
            isActive: true,
            isCompleted: false,
            isDismissed: false,
            skippedSections: get().skippedSections,
            stepHistory: newHistory,
          })
        );
      } catch (e) {
        console.warn('Failed to persist onboarding completeEvent step:', e);
      }
    }
  },

  next: async () => {
    get().completeEvent('NEXT_EXPLANATION');
  },

  previous: async () => {
    const { currentStepId, userId, stepHistory } = get();
    if (!currentStepId) return;

    let targetStepId: string | null = null;
    let newHistory = [...stepHistory];

    if (newHistory.length > 0) {
      targetStepId = newHistory.pop() || null;
    } else {
      const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStepId);
      if (currentIndex > 0) {
        targetStepId = ONBOARDING_STEPS[currentIndex - 1].id;
      }
    }

    if (!targetStepId) return;

    const prevStep = ONBOARDING_STEPS.find((s) => s.id === targetStepId);
    if (!prevStep) return;

    set({
      currentStepId: prevStep.id,
      currentSection: prevStep.section,
      stepHistory: newHistory,
    });

    if (userId) {
      try {
        await AsyncStorage.setItem(
          getStorageKey(userId),
          JSON.stringify({
            userId,
            currentStepId: prevStep.id,
            currentSection: prevStep.section,
            isActive: true,
            isCompleted: false,
            isDismissed: false,
            skippedSections: get().skippedSections,
            stepHistory: newHistory,
          })
        );
      } catch (e) {
        console.warn('Failed to persist onboarding previous step:', e);
      }
    }
  },

  goToStep: async (stepId: string) => {
    const { userId, currentStepId, stepHistory } = get();
    const targetStep = ONBOARDING_STEPS.find((s) => s.id === stepId);
    if (!targetStep) return;

    const newHistory = currentStepId ? [...stepHistory, currentStepId] : stepHistory;

    set({
      currentStepId: targetStep.id,
      currentSection: targetStep.section,
      stepHistory: newHistory,
    });

    if (userId) {
      try {
        await AsyncStorage.setItem(
          getStorageKey(userId),
          JSON.stringify({
            userId,
            currentStepId: targetStep.id,
            currentSection: targetStep.section,
            isActive: true,
            isCompleted: false,
            isDismissed: false,
            skippedSections: get().skippedSections,
            stepHistory: newHistory,
          })
        );
      } catch (e) {
        console.warn('Failed to persist onboarding goToStep:', e);
      }
    }
  },

  skipSection: async () => {
    const { currentSection, userId, currentStepId, stepHistory } = get();
    if (!currentSection) return;

    const nextSectionStep = ONBOARDING_STEPS.find(
      (s) => s.section !== currentSection && !get().skippedSections.includes(s.section)
    );
    const nextSkipped = [...get().skippedSections, currentSection];

    if (!nextSectionStep) {
      get().complete();
      return;
    }

    const newHistory = currentStepId ? [...stepHistory, currentStepId] : stepHistory;

    set({
      currentStepId: nextSectionStep.id,
      currentSection: nextSectionStep.section,
      skippedSections: nextSkipped,
      stepHistory: newHistory,
    });

    if (userId) {
      try {
        await AsyncStorage.setItem(
          getStorageKey(userId),
          JSON.stringify({
            userId,
            currentStepId: nextSectionStep.id,
            currentSection: nextSectionStep.section,
            isActive: true,
            isCompleted: false,
            isDismissed: false,
            skippedSections: nextSkipped,
            stepHistory: newHistory,
          })
        );
      } catch (e) {
        console.warn('Failed to persist onboarding skipSection:', e);
      }
    }
  },

  exit: async () => {
    const { userId } = get();
    set({
      isActive: false,
      isDismissed: true,
      currentStepId: null,
      currentSection: null,
    });

    if (userId) {
      try {
        await AsyncStorage.setItem(
          getStorageKey(userId),
          JSON.stringify({
            userId,
            isActive: false,
            isCompleted: false,
            isDismissed: true,
          })
        );
      } catch (e) {
        console.warn('Failed to persist onboarding exit:', e);
      }
    }
  },

  complete: async () => {
    const { userId } = get();
    const nowIso = new Date().toISOString();
    set({
      isActive: false,
      isCompleted: true,
      completedAt: nowIso,
      currentStepId: null,
      currentSection: null,
    });

    if (userId) {
      try {
        await AsyncStorage.setItem(
          getStorageKey(userId),
          JSON.stringify({
            userId,
            isActive: false,
            isCompleted: true,
            completedAt: nowIso,
          })
        );
      } catch (e) {
        console.warn('Failed to persist onboarding complete:', e);
      }
    }
  },

  resetForUser: async (userId: string) => {
    if (!userId) return;
    try {
      await AsyncStorage.removeItem(getStorageKey(userId));
      get().startForUser(userId);
    } catch (e) {
      console.warn('Failed to reset onboarding state:', e);
    }
  },

  registerTarget: (registration: TargetRegistration) => {
    set((state) => ({
      targets: {
        ...state.targets,
        [registration.id]: registration,
      },
    }));
  },

  unregisterTarget: (id: string) => {
    set((state) => {
      const nextTargets = { ...state.targets };
      delete nextTargets[id];
      return { targets: nextTargets };
    });
  },

  setActiveModalLayer: (layer: string | null) => {
    set({ activeModalLayer: layer });
  },
}));
