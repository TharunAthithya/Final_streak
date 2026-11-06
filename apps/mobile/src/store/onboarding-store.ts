import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NavDirection,
  OnboardingContext,
  OnboardingEvent,
  OnboardingLayerId,
  OnboardingSection,
  OnboardingStep,
  PersistedOnboarding,
  TargetRect,
} from '../onboarding/onboarding-types';
import { ONBOARDING_STEPS, STEP_BY_ID } from '../onboarding/onboarding-constants';

export const getOnboardingStorageKey = (userId: string) => `@streak_onboarding_state_${userId}`;

const initialContext: OnboardingContext = {
  hasHabits: false,
  roomCount: 0,
  scheduleType: 'DAILY',
  createdHabit: false,
  createdRoomId: null,
};

interface OnboardingStoreState {
  userId: string | null;
  isActive: boolean;
  isCompleted: boolean;
  isDismissed: boolean;
  currentSection: OnboardingSection | null;
  currentStepId: string | null;
  completedSteps: string[];
  skippedSections: OnboardingSection[];
  history: string[];
  navDirection: NavDirection;
  ctx: OnboardingContext;
  openLayers: Partial<Record<OnboardingLayerId, boolean>>;
  targets: Record<string, TargetRect>;
  startedAt?: string;
  completedAt?: string;

  startForUser: (userId: string | null) => Promise<void>;
  completeStep: (event: OnboardingEvent) => void;
  next: () => void;
  previous: () => void;
  skipSection: () => void;
  exitTutorial: () => void;
  completeTutorial: () => void;
  resetForUser: (userId: string) => Promise<void>;
  setContext: (patch: Partial<OnboardingContext>) => void;
  markHabitCreated: () => void;
  markRoomCreated: (roomId: string | null) => void;
  setLayerOpen: (layer: OnboardingLayerId, open: boolean) => void;
  setTarget: (id: string, rect: TargetRect | null) => void;
}

const blankSession = {
  userId: null,
  isActive: false,
  isCompleted: false,
  isDismissed: false,
  currentSection: null,
  currentStepId: null,
  completedSteps: [] as string[],
  skippedSections: [] as OnboardingSection[],
  history: [] as string[],
  navDirection: 'fwd' as NavDirection,
  ctx: initialContext,
  openLayers: {} as Partial<Record<OnboardingLayerId, boolean>>,
  targets: {} as Record<string, TargetRect>,
  startedAt: undefined,
  completedAt: undefined,
};

const persist = (s: OnboardingStoreState) => {
  if (!s.userId) return;
  const data: PersistedOnboarding = {
    currentStepId: s.currentStepId,
    history: s.history,
    completedSteps: s.completedSteps,
    skippedSections: s.skippedSections,
    isCompleted: s.isCompleted,
    isDismissed: s.isDismissed,
    createdHabit: s.ctx.createdHabit,
    createdRoomId: s.ctx.createdRoomId,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
  };
  AsyncStorage.setItem(getOnboardingStorageKey(s.userId), JSON.stringify(data)).catch((e) =>
    console.warn('Failed to persist onboarding state:', e)
  );
};

const findNextIndex = (fromIndex: number, ctx: OnboardingContext, differentSection?: OnboardingSection): number => {
  for (let i = fromIndex + 1; i < ONBOARDING_STEPS.length; i++) {
    const step = ONBOARDING_STEPS[i];
    if (differentSection && step.section === differentSection) continue;
    if (!step.skipIf || !step.skipIf(ctx)) return i;
  }
  return -1;
};

export const useOnboardingStore = create<OnboardingStoreState>((set, get) => {
  const commit = (patch: Partial<OnboardingStoreState>) => {
    set(patch);
    persist(get());
  };

  const moveTo = (index: number, direction: NavDirection, extra: Partial<OnboardingStoreState> = {}) => {
    const s = get();
    const target = ONBOARDING_STEPS[index];
    commit({
      ...extra,
      currentStepId: target.id,
      currentSection: target.section,
      history: s.currentStepId ? [...s.history, s.currentStepId] : s.history,
      navDirection: direction,
    });
  };

  const advance = (markDone: boolean) => {
    const s = get();
    const step = s.currentStepId ? STEP_BY_ID[s.currentStepId] : undefined;
    if (!step) return;
    const completedSteps =
      markDone && !s.completedSteps.includes(step.id) ? [...s.completedSteps, step.id] : s.completedSteps;
    const nextIndex = findNextIndex(ONBOARDING_STEPS.indexOf(step), s.ctx);
    if (nextIndex === -1) {
      set({ completedSteps });
      get().completeTutorial();
      return;
    }
    moveTo(nextIndex, 'fwd', { completedSteps });
  };

  return {
    ...blankSession,

    startForUser: async (userId) => {
      if (!userId) {
        set({ ...blankSession });
        return;
      }
      if (get().userId === userId) return;
      // Reset everything in memory first so another account's state is never exposed.
      set({ ...blankSession, userId });

      let saved: PersistedOnboarding | null = null;
      try {
        const raw = await AsyncStorage.getItem(getOnboardingStorageKey(userId));
        saved = raw ? (JSON.parse(raw) as PersistedOnboarding) : null;
      } catch (e) {
        console.warn('Failed to read onboarding state:', e);
      }
      // Account changed while loading — ignore this result.
      if (get().userId !== userId) return;

      if (!saved) {
        const first = ONBOARDING_STEPS[0];
        commit({
          isActive: true,
          currentStepId: first.id,
          currentSection: first.section,
          startedAt: new Date().toISOString(),
        });
        return;
      }

      const finished = !!saved.isCompleted || !!saved.isDismissed;
      const stepId = saved.currentStepId && STEP_BY_ID[saved.currentStepId] ? saved.currentStepId : ONBOARDING_STEPS[0].id;
      set({
        isActive: !finished,
        isCompleted: !!saved.isCompleted,
        isDismissed: !!saved.isDismissed,
        currentStepId: finished ? null : stepId,
        currentSection: finished ? null : STEP_BY_ID[stepId].section,
        completedSteps: saved.completedSteps || [],
        skippedSections: saved.skippedSections || [],
        history: (saved.history || []).filter((id) => !!STEP_BY_ID[id]),
        ctx: { ...initialContext, createdHabit: !!saved.createdHabit, createdRoomId: saved.createdRoomId || null },
        startedAt: saved.startedAt,
        completedAt: saved.completedAt,
      });
    },

    completeStep: (event) => {
      const s = get();
      if (!s.isActive || !s.currentStepId) return;
      const step = STEP_BY_ID[s.currentStepId];
      if (!step || step.kind !== 'action' || step.event !== event) return;
      advance(true);
    },

    next: () => {
      const s = get();
      if (!s.isActive || !s.currentStepId) return;
      const step = STEP_BY_ID[s.currentStepId];
      if (!step) return;
      if (step.kind === 'final') {
        get().completeTutorial();
      } else if (step.kind === 'info' || s.completedSteps.includes(step.id)) {
        advance(step.kind === 'info');
      }
    },

    previous: () => {
      const s = get();
      if (!s.isActive || !s.currentStepId) return;
      const history = [...s.history];
      let target: OnboardingStep | undefined;
      while (history.length > 0) {
        const candidate = STEP_BY_ID[history.pop() as string];
        if (!candidate) continue;
        // Never land inside a modal that is no longer open (e.g. a habit sheet that was already submitted).
        if (candidate.layer !== 'root' && !s.openLayers[candidate.layer]) continue;
        target = candidate;
        break;
      }
      if (!target) return;
      commit({
        currentStepId: target.id,
        currentSection: target.section,
        history,
        navDirection: 'back',
      });
    },

    skipSection: () => {
      const s = get();
      if (!s.isActive || !s.currentStepId) return;
      const step = STEP_BY_ID[s.currentStepId];
      if (!step) return;
      const skippedSections = s.skippedSections.includes(step.section)
        ? s.skippedSections
        : [...s.skippedSections, step.section];
      const nextIndex = findNextIndex(ONBOARDING_STEPS.indexOf(step), s.ctx, step.section);
      if (nextIndex === -1) {
        set({ skippedSections });
        get().completeTutorial();
        return;
      }
      moveTo(nextIndex, 'skip', { skippedSections });
    },

    exitTutorial: () => {
      commit({ isActive: false, isDismissed: true, currentStepId: null, currentSection: null });
    },

    completeTutorial: () => {
      commit({
        isActive: false,
        isCompleted: true,
        currentStepId: null,
        currentSection: null,
        completedAt: new Date().toISOString(),
      });
    },

    resetForUser: async (userId) => {
      if (!userId) return;
      try {
        await AsyncStorage.removeItem(getOnboardingStorageKey(userId));
      } catch (e) {
        console.warn('Failed to reset onboarding state:', e);
      }
      set({ ...blankSession });
      await get().startForUser(userId);
    },

    setContext: (patch) => {
      const prev = get().ctx;
      const keys = Object.keys(patch) as (keyof OnboardingContext)[];
      if (keys.every((k) => prev[k] === patch[k])) return;
      set({ ctx: { ...prev, ...patch } });
    },

    markHabitCreated: () => {
      set({ ctx: { ...get().ctx, createdHabit: true, hasHabits: true } });
      persist(get());
      get().completeStep('HABIT_CREATED');
    },

    markRoomCreated: (roomId) => {
      set({ ctx: { ...get().ctx, createdRoomId: roomId || 'created', roomCount: Math.max(1, get().ctx.roomCount) } });
      persist(get());
      get().completeStep('ROOM_CREATED');
    },

    setLayerOpen: (layer, open) => {
      if (!!get().openLayers[layer] === open) return;
      set({ openLayers: { ...get().openLayers, [layer]: open } });
    },

    setTarget: (id, rect) => {
      const targets = get().targets;
      if (!rect) {
        if (!(id in targets)) return;
        const next = { ...targets };
        delete next[id];
        set({ targets: next });
        return;
      }
      set({ targets: { ...targets, [id]: rect } });
    },
  };
});

/** Current step while the tutorial is running, otherwise null. */
export const useCurrentStep = (): OnboardingStep | null =>
  useOnboardingStore((s) => (s.isActive && s.currentStepId ? STEP_BY_ID[s.currentStepId] || null : null));
