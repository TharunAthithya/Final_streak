import { describe, test, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '../../../apps/mobile/node_modules/@react-native-async-storage/async-storage/lib/commonjs/index.js';
import { useOnboardingStore } from '../../../apps/mobile/src/store/onboarding-store.js';
import { calculateTutorialPosition } from '../../../apps/mobile/src/onboarding/onboarding-positioning.js';

const mockStorage = new Map<string, string>();

describe('Onboarding Store & Tutorial Flow Tests', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.spyOn(AsyncStorage, 'getItem').mockImplementation((key: string) =>
      Promise.resolve(mockStorage.get(key) ?? null)
    );
    vi.spyOn(AsyncStorage, 'setItem').mockImplementation((key: string, val: string) => {
      mockStorage.set(key, val);
      return Promise.resolve();
    });
    vi.spyOn(AsyncStorage, 'removeItem').mockImplementation((key: string) => {
      mockStorage.delete(key);
      return Promise.resolve();
    });
    useOnboardingStore.getState().clearSession();
    useOnboardingStore.getState().setNavigator(null);
  });

  test('New signup starts tutorial at today.lesson and navigates to /(tabs)/today', async () => {
    const navigatedRoutes: string[] = [];
    useOnboardingStore.getState().setNavigator((r) => navigatedRoutes.push(r));

    await useOnboardingStore.getState().resetForUser('new-user-1');

    const state = useOnboardingStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.userId).toBe('new-user-1');
    expect(state.currentStepId).toBe('today.lesson');
    expect(state.currentSection).toBe('LESSON');
    expect(navigatedRoutes).toContain('/(tabs)/today');
  });

  test('Existing user login (loadForUser with no saved storage) does NOT auto-start tutorial', async () => {
    await useOnboardingStore.getState().loadForUser('existing-user-1');

    const state = useOnboardingStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.currentStepId).toBeNull();
  });

  test('loadForUser restores in-progress tutorial for a user who had not finished', async () => {
    await useOnboardingStore.getState().resetForUser('user-2');
    await useOnboardingStore.getState().completeEvent('LESSON_OPENED');
    expect(useOnboardingStore.getState().currentStepId).toBe('lesson.modal');

    // Simulate app restart
    useOnboardingStore.getState().clearSession();
    expect(useOnboardingStore.getState().isActive).toBe(false);

    await useOnboardingStore.getState().loadForUser('user-2');
    expect(useOnboardingStore.getState().isActive).toBe(true);
    expect(useOnboardingStore.getState().currentStepId).toBe('lesson.modal');
  });

  test('ACTION steps only advance on their matching completionEvent, not on NEXT_EXPLANATION', async () => {
    await useOnboardingStore.getState().resetForUser('user-3');
    expect(useOnboardingStore.getState().currentStepId).toBe('today.lesson');

    // Calling next() on an ACTION step should not advance
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('today.lesson');

    // Firing LESSON_OPENED advances to lesson.modal
    await useOnboardingStore.getState().completeEvent('LESSON_OPENED');
    expect(useOnboardingStore.getState().currentStepId).toBe('lesson.modal');
  });

  test('Conditional step habit.specificDays is skipped by default and included when flag is enabled', async () => {
    await useOnboardingStore.getState().resetForUser('user-4');
    await useOnboardingStore.getState().goToStep('habit.schedule');
    expect(useOnboardingStore.getState().currentStepId).toBe('habit.schedule');

    // Default (Every Day): skips habit.specificDays -> goes straight to habit.create
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('habit.create');

    // Go back and enable conditional flag for habit.specificDays
    await useOnboardingStore.getState().previous();
    expect(useOnboardingStore.getState().currentStepId).toBe('habit.schedule');

    useOnboardingStore.getState().setConditionalFlag('habit.specificDays', true);
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('habit.specificDays');
  });

  test('Full 25-step flow walks from today.lesson to onboarding.complete and marks completed', async () => {
    const routes: string[] = [];
    useOnboardingStore.getState().setNavigator((r) => routes.push(r));

    await useOnboardingStore.getState().resetForUser('user-full');

    // 1. today.lesson -> LESSON_OPENED
    expect(useOnboardingStore.getState().currentStepId).toBe('today.lesson');
    await useOnboardingStore.getState().completeEvent('LESSON_OPENED');

    // 2. lesson.modal -> Next
    expect(useOnboardingStore.getState().currentStepId).toBe('lesson.modal');
    await useOnboardingStore.getState().next();

    // 3. lesson.slide -> LESSON_STARTED
    expect(useOnboardingStore.getState().currentStepId).toBe('lesson.slide');
    await useOnboardingStore.getState().completeEvent('LESSON_STARTED');

    // 4. lesson.close -> LESSON_CLOSED (or Next)
    expect(useOnboardingStore.getState().currentStepId).toBe('lesson.close');
    await useOnboardingStore.getState().completeEvent('LESSON_CLOSED');

    // 5. today.promise -> Next
    expect(useOnboardingStore.getState().currentStepId).toBe('today.promise');
    await useOnboardingStore.getState().next();

    // 6. today.progressAndStreak -> Next
    expect(useOnboardingStore.getState().currentStepId).toBe('today.progressAndStreak');
    await useOnboardingStore.getState().next();

    // 7. today.createHabit -> HABIT_SHEET_OPENED
    expect(useOnboardingStore.getState().currentStepId).toBe('today.createHabit');
    await useOnboardingStore.getState().completeEvent('HABIT_SHEET_OPENED');

    // 8. habit.name -> HABIT_NAME_ENTERED
    expect(useOnboardingStore.getState().currentStepId).toBe('habit.name');
    await useOnboardingStore.getState().completeEvent('HABIT_NAME_ENTERED');

    // 9. habit.icon -> Next
    expect(useOnboardingStore.getState().currentStepId).toBe('habit.icon');
    await useOnboardingStore.getState().next();

    // 10. habit.schedule -> Next (skips habit.specificDays by default)
    expect(useOnboardingStore.getState().currentStepId).toBe('habit.schedule');
    await useOnboardingStore.getState().next();

    // 12. habit.create -> HABIT_CREATED
    expect(useOnboardingStore.getState().currentStepId).toBe('habit.create');
    await useOnboardingStore.getState().completeEvent('HABIT_CREATED');

    // 13. today.createdHabit -> Next
    expect(useOnboardingStore.getState().currentStepId).toBe('today.createdHabit');
    await useOnboardingStore.getState().next();

    // 14. rooms.introduction -> Next (navigates to /(tabs)/rooms)
    expect(useOnboardingStore.getState().currentStepId).toBe('rooms.introduction');
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('rooms.create');
    expect(routes).toContain('/(tabs)/rooms');

    // 15. rooms.create -> Next
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('rooms.join');

    // 16. rooms.join -> Next
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('rooms.roomCode');

    // 17. rooms.roomCode -> Next
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('room.create.habits');

    // 18. room.create.habits -> Next
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('room.create.invite');

    // 19. room.create.invite -> Next
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('room.create.duration');

    // 20. room.create.duration -> ROOM_CREATED
    await useOnboardingStore.getState().completeEvent('ROOM_CREATED');
    expect(useOnboardingStore.getState().currentStepId).toBe('room.card');

    // 21. room.card -> ROOM_OPENED
    await useOnboardingStore.getState().completeEvent('ROOM_OPENED');
    expect(useOnboardingStore.getState().currentStepId).toBe('room.progress');

    // 22. room.progress -> Next
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('room.sharedHabits');

    // 23. room.sharedHabits -> Next
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('room.activity');

    // 24. room.activity -> Next
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().currentStepId).toBe('onboarding.complete');

    // 25. onboarding.complete -> Next finishes tutorial
    await useOnboardingStore.getState().next();
    expect(useOnboardingStore.getState().isActive).toBe(false);
    expect(useOnboardingStore.getState().isCompleted).toBe(true);
  });

  test('Replay resets completed tutorial back to step 1 and navigates to /(tabs)/today', async () => {
    const routes: string[] = [];
    useOnboardingStore.getState().setNavigator((r) => routes.push(r));

    await useOnboardingStore.getState().resetForUser('user-replay');
    await useOnboardingStore.getState().exit();
    expect(useOnboardingStore.getState().isDismissed).toBe(true);
    expect(useOnboardingStore.getState().isActive).toBe(false);

    routes.length = 0;
    await useOnboardingStore.getState().replay('user-replay');

    const state = useOnboardingStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.isDismissed).toBe(false);
    expect(state.isCompleted).toBe(false);
    expect(state.currentStepId).toBe('today.lesson');
    expect(routes).toContain('/(tabs)/today');
  });

  test('calculateTutorialPosition places card below target in top half and above target in bottom half', () => {
    const screen = { width: 390, height: 844 };
    const card = { width: 320, height: 180 };
    const safe = { top: 44, bottom: 40 };

    const topTarget = { x: 24, y: 120, width: 342, height: 60 };
    const posBelow = calculateTutorialPosition(topTarget, card, screen, safe);
    expect(posBelow.placement).toBe('below');
    expect(posBelow.y).toBeGreaterThanOrEqual(topTarget.y + topTarget.height);

    const bottomTarget = { x: 300, y: 720, width: 56, height: 56 };
    const posAbove = calculateTutorialPosition(bottomTarget, card, screen, safe);
    expect(posAbove.placement).toBe('above');
    expect(posAbove.y + card.height).toBeLessThanOrEqual(bottomTarget.y);

    const noTarget = calculateTutorialPosition(undefined, card, screen, safe);
    expect(noTarget.placement).toBe('center');
  });
});
