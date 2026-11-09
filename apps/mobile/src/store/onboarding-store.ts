import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingSection, OnboardingState, TargetRegistration, OnboardingCompletionEvent } from '../onboarding/onboarding-types';
import { ONBOARDING_STEPS } from '../onboarding/onboarding-constants';

const getStorageKey = (userId: string) => `@streak_onboarding_state_${userId}`;

let navigatorFn: ((route: string) => void) | null = null;

function navigateIfNeeded(route?: string) {
  if (route && navigatorFn) {
    try {
      navigatorFn(route);
    } catch (e) {
      console.warn('Failed to navigate for onboarding step:', e);
    }
  }
}

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
  conditionalFlags: {},

  setNavigator: (nav: ((route: string) => void) | null) => {
    navigatorFn = nav;
  },

  setConditionalFlag: (stepId: string, enabled: boolean) => {
    set((state) => ({
      conditionalFlags: {
        ...state.conditionalFlags,
        [stepId]: enabled,
      },
    }));
  },

  clearSession: () => {
    set({
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
      conditionalFlags: {},
    });
  },

  loadForUser: async (userId: string) => {
    if (!userId) return;

    try {
      const storageKey = getStorageKey(userId);
      const rawData = await AsyncStorage.getItem(storageKey);

      if (!rawData) {
        // Existing user who never had onboarding started on signup: do NOT auto-start
        set({
          userId,
          isActive: false,
          isCompleted: false,
          isDismissed: false,
          currentStepId: null,
          currentSection: null,
          stepHistory: [],
        });
        return;
      }

      const saved = JSON.parse(rawData);
      if (saved.isCompleted || saved.isDismissed || !saved.isActive) {
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
      navigateIfNeeded(step.route);
    } catch (e) {
      console.warn('Failed to load onboarding for user:', e);
    }
  },

  startForUser: async (userId: string, hasHabits = false, _hasRooms = false) => {
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
        navigateIfNeeded(step.route);
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
        conditionalFlags: {},
      });

      navigateIfNeeded(initialStep.route);

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
    const { currentStepId, userId, isActive, isCompleted, isDismissed, stepHistory, conditionalFlags } = get();
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
      await get().complete();
      return;
    }

    let nextIndex = currentIndex + 1;
    while (
      nextIndex < ONBOARDING_STEPS.length &&
      ONBOARDING_STEPS[nextIndex].isConditional &&
      !conditionalFlags[ONBOARDING_STEPS[nextIndex].id]
    ) {
      nextIndex++;
    }

    if (nextIndex >= ONBOARDING_STEPS.length) {
      await get().complete();
      return;
    }

    const nextStep = ONBOARDING_STEPS[nextIndex];
    const newHistory = [...stepHistory, currentStepId];

    set({
      currentStepId: nextStep.id,
      currentSection: nextStep.section,
      stepHistory: newHistory,
    });

    if (nextStep.route && nextStep.route !== currentStep.route) {
      navigateIfNeeded(nextStep.route);
    }

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
    await get().completeEvent('NEXT_EXPLANATION');
  },

  previous: async () => {
    const { currentStepId, userId, stepHistory } = get();
    if (!currentStepId) return;

    const currentStep = ONBOARDING_STEPS.find((s) => s.id === currentStepId);

    let targetStepId: string | null = null;
    const newHistory = [...stepHistory];

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

    if (prevStep.route && prevStep.route !== currentStep?.route) {
      navigateIfNeeded(prevStep.route);
    }

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

    if (targetStep.route) {
      navigateIfNeeded(targetStep.route);
    }

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

    const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStepId);
    const nextSkipped = [...get().skippedSections, currentSection];

    const nextSectionStep = ONBOARDING_STEPS.slice(Math.max(0, currentIndex + 1)).find(
      (s) => s.section !== currentSection && !nextSkipped.includes(s.section) && !s.isConditional
    );

    if (!nextSectionStep) {
      await get().complete();
      return;
    }

    const newHistory = currentStepId ? [...stepHistory, currentStepId] : stepHistory;

    set({
      currentStepId: nextSectionStep.id,
      currentSection: nextSectionStep.section,
      skippedSections: nextSkipped,
      stepHistory: newHistory,
    });

    if (nextSectionStep.route) {
      navigateIfNeeded(nextSectionStep.route);
    }

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
      await get().startForUser(userId, false, false);
    } catch (e) {
      console.warn('Failed to reset onboarding state:', e);
    }
  },

  replay: async (explicitUserId?: string) => {
    const targetUserId = explicitUserId || get().userId;
    if (!targetUserId) return;
    await get().resetForUser(targetUserId);
    navigateIfNeeded('/(tabs)/today');
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
