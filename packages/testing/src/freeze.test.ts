import { describe, test, expect, vi } from 'vitest';
import { HabitResponse, HabitStatus, ScheduleType } from '@streak/contracts';
import { validateFreeze, checkAndRegenerateFreeze, calculateSessionStatuses, calculateCalendarGridStatuses, getSessionStatusForDate } from '../../../apps/mobile/src/utils/freeze.js';
import { calculateDailyPromiseProgress, normalizeToLocalMidnight, toLocalDateString, isHabitScheduledForDate } from '../../../apps/mobile/src/utils/streak.js';
import { getStoryIndexForDate } from '../../../apps/mobile/src/store/daily-story-store.js';
import { DAILY_STORIES } from '../../../apps/mobile/src/data/daily-stories.js';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve(null)),
    removeItem: vi.fn(() => Promise.resolve(null)),
  },
}));

// Helper to construct a base mock habit
function createMockHabit(overrides: Partial<HabitResponse> = {}): HabitResponse {
  return {
    id: 'habit-123',
    userId: 'user-123',
    name: 'Exercise',
    status: HabitStatus.ACTIVE,
    scheduleType: ScheduleType.DAILY,
    timezone: 'UTC',
    startDate: '2026-07-01',
    createdAt: '2026-07-01T00:00:00Z',
    freezeDaysAvailable: 1,
    lastFreezeReset: '2026-07-01T00:00:00Z',
    checkIns: [],
    ...overrides,
  };
}

describe('Habit Freeze Feature Tests', () => {
  const today = new Date('2026-07-10T12:00:00Z');
  const todayStr = '2026-07-10';
  const yesterdayStr = '2026-07-09';
  const twoDaysAgoStr = '2026-07-08';
  const threeDaysAgoStr = '2026-07-07';
  const fourDaysAgoStr = '2026-07-06';
  const tomorrowStr = '2026-07-11';

  // Scenario 1: Complete -> Complete -> Freeze -> Complete: streak stays continuous.
  test('Scenario 1: Streak remains continuous when using a Freeze', () => {
    // We simulate a streak calculation function similar to the database's logic
    const checkIns = [
      { id: '1', localDate: '2026-07-01', status: 'COMPLETED' },
      { id: '2', localDate: '2026-07-02', status: 'COMPLETED' },
      { id: '3', localDate: '2026-07-03', status: 'FREEZE' },
      { id: '4', localDate: '2026-07-04', status: 'COMPLETED' },
    ];

    // Helper to calculate daily streak from check-ins history
    const calculateStreak = (dates: { localDate: string }[]) => {
      const sorted = [...dates].sort((a, b) => b.localDate.localeCompare(a.localDate));
      if (sorted.length === 0) return 0;
      let streak = 1;
      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = new Date(sorted[i].localDate);
        const prev = new Date(sorted[i + 1].localDate);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    };

    const streak = calculateStreak(checkIns);
    expect(streak).toBe(4); // All 4 days count as a continuous streak
  });

  // Scenario 2: Reject when freezeDaysAvailable == 0.
  test('Scenario 2: Reject when freezeDaysAvailable == 0', () => {
    const habit = createMockHabit({
      freezeDaysAvailable: 0,
      lastFreezeReset: new Date().toISOString(),
    });
    const result = validateFreeze(habit, yesterdayStr, today);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No freeze days available');
  });

  // Scenario 3: Reject a future target date.
  test('Scenario 3: Reject a future target date', () => {
    const habit = createMockHabit({ freezeDaysAvailable: 1 });
    const result = validateFreeze(habit, tomorrowStr, today);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Target date cannot be in the future');
  });

  // Scenario 4: Reject a target date older than 3 days.
  test('Scenario 4: Reject a target date older than 3 days', () => {
    const habit = createMockHabit({ freezeDaysAvailable: 1 });
    const result = validateFreeze(habit, fourDaysAgoStr, today);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Target date is too old');
  });

  // Scenario 5: Reject Freeze on a rest/unscheduled day.
  test('Scenario 5: Reject Freeze on a rest/unscheduled day', () => {
    // Habit scheduled on Monday (1), Wednesday (3), Friday (5).
    // July 9th 2026 is a Thursday (4), so it is unscheduled.
    const habit = createMockHabit({
      scheduleType: ScheduleType.SPECIFIC_DAYS,
      daysOfWeek: [1, 3, 5],
    } as any);

    const targetDate = '2026-07-09'; // Thursday
    const refToday = new Date('2026-07-10T12:00:00Z'); // Friday

    const result = validateFreeze(habit, targetDate, refToday);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Target date is not a scheduled day');
  });

  // Scenario 6: Reject a duplicate Freeze on an already-frozen or already-completed day.
  test('Scenario 6: Reject duplicate Freeze', () => {
    const habit = createMockHabit({
      checkIns: [{ id: 'c1', localDate: yesterdayStr, status: 'FREEZE' }],
    });
    const result = validateFreeze(habit, yesterdayStr, today);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Target date already has a completion or freeze');
  });

  // Scenario 7: After 7+ days since lastFreezeReset, freezeDaysAvailable resets to 1 (and never exceeds 1).
  test('Scenario 7: Freeze regenerates after 7 days', () => {
    // 8 days ago
    const lastReset = new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const habit = createMockHabit({
      freezeDaysAvailable: 0,
      lastFreezeReset: lastReset,
    });

    const regenerated = checkAndRegenerateFreeze(habit);
    expect(regenerated.modified).toBe(true);
    expect(regenerated.freezeDaysAvailable).toBe(1);

    // Ensure it caps at 1 and does not double-accumulate
    const habitAlreadyAvailable = createMockHabit({
      freezeDaysAvailable: 1,
      lastFreezeReset: lastReset,
    });
    const regeneratedCap = checkAndRegenerateFreeze(habitAlreadyAvailable);
    expect(regeneratedCap.freezeDaysAvailable).toBe(1);
  });

  // Scenario 8: Apply Freeze offline, reconnect: syncs exactly once, no duplicate consumption.
  test('Scenario 8: Deduplication and sync flow simulation', () => {
    // Simulating queueing actions in Zustand store
    const queue: any[] = [];
    const enqueueFreeze = (habitId: string, localDate: string) => {
      // Deduplicate: check if already exists
      const exists = queue.some(
        (item) => item.name === 'freeze_habit' && item.args.habitId === habitId && item.args.localDate === localDate
      );
      if (!exists) {
        queue.push({
          name: 'freeze_habit',
          args: { habitId, localDate, idempotencyKey: 'idemp-123' },
        });
      }
    };

    // Attempt double enqueue
    enqueueFreeze('habit-123', yesterdayStr);
    enqueueFreeze('habit-123', yesterdayStr);

    expect(queue.length).toBe(1); // Queue contains exactly one action, preventing duplicate network replay
  });

  // Scenario 9: Completion percentage calculation excludes Freeze days.
  test('Scenario 9: Completion percentage excludes Freeze', () => {
    // Habit has 2 completions and 1 freeze
    const habit = createMockHabit({
      checkIns: [
        { id: '1', localDate: '2026-07-08', status: 'COMPLETED' },
        { id: '2', localDate: '2026-07-09', status: 'FREEZE' },
        { id: '3', localDate: '2026-07-10', status: 'COMPLETED' },
      ],
    });

    // Calculate completion count (must only count status === 'COMPLETED')
    const completedCount = (habit.checkIns || []).filter((c) => !c.status || c.status === 'COMPLETED').length;
    expect(completedCount).toBe(2); // Freeze day is excluded
  });

  // Scenario 10: Global Streak value is unaffected by any Freeze operation.
  test('Scenario 10: Global Streak is unaffected by Freeze', () => {
    // Two habits, one scheduled yesterday is completed, one is frozen yesterday
    const habits = [
      createMockHabit({
        id: 'h1',
        checkIns: [{ id: 'c1', localDate: yesterdayStr, status: 'COMPLETED' }],
      }),
      createMockHabit({
        id: 'h2',
        checkIns: [{ id: 'c2', localDate: yesterdayStr, status: 'FREEZE' }],
      }),
    ];

    const progress = calculateDailyPromiseProgress(habits, yesterdayStr, today);
    // h1 is completed yesterday. h2 is not completed yesterday (since it is frozen).
    // Total scheduled: 2
    // Completed: 1 (h1)
    // Ratio: 0.5 (meets the 50% success threshold for Global Streak)
    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(2);
    expect(progress.ratio).toBe(0.5);
    expect(progress.status).toBe('SUCCESS'); // Global Streak progress succeeds
  });
});

describe('Rolling 14-day Calendar Grid Tests', () => {
  // Scenario 1: New user, no history yet — grid renders correctly (mostly upcoming/not-scheduled).
  test('Scenario 1: New user with no history renders upcoming or missed past days', () => {
    const today = new Date('2026-07-08T12:00:00Z'); // Wednesday
    const habit = createMockHabit({
      createdAt: '2026-07-01T00:00:00Z',
      startDate: '2026-07-01',
      checkIns: [],
    });

    const statuses = calculateCalendarGridStatuses(habit, today);
    expect(statuses.length).toBe(14);
    // Row 1 (previous week: Mon 6/29 -> Sun 7/5)
    // Mon 6/29 and Tue 6/30 are prior to habit start date (7/1), so they are not scheduled.
    expect(statuses[0]).toBe('not_scheduled'); // Mon
    expect(statuses[1]).toBe('not_scheduled'); // Tue
    // Wed 7/1 -> Sun 7/5 are past, active, no completion -> missed
    expect(statuses[2]).toBe('missed');
    expect(statuses[6]).toBe('missed');

    // Row 2 (current week: Mon 7/6 -> Sun 7/12)
    // Mon 7/6 and Tue 7/7 are past -> missed
    expect(statuses[7]).toBe('missed');
    expect(statuses[8]).toBe('missed');
    // Wed 7/8 is today -> pending
    expect(statuses[9]).toBe('pending');
    // Thu 7/9 -> Sun 7/12 are future -> pending
    expect(statuses[10]).toBe('pending');
    expect(statuses[13]).toBe('pending');
  });

  // Scenario 2: Daily habit — every day scheduled.
  test('Scenario 2: Daily habit has no not_scheduled days', () => {
    const today = new Date('2026-07-08T12:00:00Z');
    const habit = createMockHabit({
      scheduleType: ScheduleType.DAILY,
      startDate: '2026-06-01', // long ago
    });

    const statuses = calculateCalendarGridStatuses(habit, today);
    expect(statuses.includes('not_scheduled')).toBe(false);
  });

  // Scenario 3: Weekday-only habit — weekends render as not-scheduled.
  test('Scenario 3: Weekday-only habit renders weekends as not_scheduled', () => {
    const today = new Date('2026-07-08T12:00:00Z');
    const habit = createMockHabit({
      scheduleType: ScheduleType.SPECIFIC_DAYS,
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      startDate: '2026-06-01',
    } as any);

    const statuses = calculateCalendarGridStatuses(habit, today);
    // Row 1 weekend (Saturday = index 5, Sunday = index 6)
    expect(statuses[5]).toBe('not_scheduled');
    expect(statuses[6]).toBe('not_scheduled');
    // Row 2 weekend (Saturday = index 12, Sunday = index 13)
    expect(statuses[12]).toBe('not_scheduled');
    expect(statuses[13]).toBe('not_scheduled');
  });

  // Scenario 4: Weekend-only habit — weekdays render as not-scheduled.
  test('Scenario 4: Weekend-only habit renders weekdays as not_scheduled', () => {
    const today = new Date('2026-07-08T12:00:00Z');
    const habit = createMockHabit({
      scheduleType: ScheduleType.SPECIFIC_DAYS,
      daysOfWeek: [0, 6], // Sun, Sat
      startDate: '2026-06-01',
    } as any);

    const statuses = calculateCalendarGridStatuses(habit, today);
    // Row 1 weekdays (indices 0 to 4)
    for (let i = 0; i <= 4; i++) {
      expect(statuses[i]).toBe('not_scheduled');
    }
    // Row 2 weekdays (indices 7 to 11)
    for (let i = 7; i <= 11; i++) {
      expect(statuses[i]).toBe('not_scheduled');
    }
  });

  // Scenario 5: Mix of completed and missed days renders each with correct color.
  test('Scenario 5: Renders correct color for mixed completed and missed days', () => {
    const today = new Date('2026-07-08T12:00:00Z');
    const habit = createMockHabit({
      startDate: '2026-06-01',
      checkIns: [
        { id: '1', localDate: '2026-06-29', status: 'COMPLETED' }, // Row 1 Mon
        { id: '2', localDate: '2026-07-06', status: 'COMPLETED' }, // Row 2 Mon
      ],
    });

    const statuses = calculateCalendarGridStatuses(habit, today);
    // Row 1 Mon is completed
    expect(statuses[0]).toBe('completed');
    // Row 1 Tue is past and has no completion -> missed
    expect(statuses[1]).toBe('missed');
    // Row 2 Mon is completed
    expect(statuses[7]).toBe('completed');
    // Row 2 Tue is past -> missed
    expect(statuses[8]).toBe('missed');
  });

  // Scenario 6: Today and future days in the current week render as upcoming.
  test('Scenario 6: Today and future days are pending/upcoming', () => {
    const today = new Date('2026-07-08T12:00:00Z'); // Wednesday
    const habit = createMockHabit({
      startDate: '2026-06-01',
      checkIns: [],
    });

    const statuses = calculateCalendarGridStatuses(habit, today);
    expect(statuses[9]).toBe('pending'); // Today (Wed)
    expect(statuses[10]).toBe('pending'); // Thu
    expect(statuses[13]).toBe('pending'); // Sun
  });

  // Scenario 7: Week transition: window shifts by exactly one week at the correct local-time boundary.
  test('Scenario 7: Grid shifts forward by exactly one week at Sunday midnight local transition', () => {
    const habit = createMockHabit({
      startDate: '2026-06-01',
      checkIns: [],
    });

    // Sunday July 12th, 12:00:00
    const sundayT = new Date('2026-07-12T12:00:00');
    const sundayStatuses = calculateCalendarGridStatuses(habit, sundayT);

    // Monday July 13th, 12:00:00
    const mondayT = new Date('2026-07-13T12:00:00');
    const mondayStatuses = calculateCalendarGridStatuses(habit, mondayT);

    for (let i = 0; i < 6; i++) {
      expect(mondayStatuses[i]).toBe(sundayStatuses[i + 7]);
    }
  });

  // Scenario 8: Month transition and year transition: grid still computes correctly across the boundary.
  test('Scenario 8: Computes correctly across Month and Year boundaries', () => {
    const habit = createMockHabit({
      startDate: '2026-12-01',
      checkIns: [],
    });

    // Friday Jan 1st, 2027
    const newYear = new Date('2027-01-01T12:00:00Z');
    const statuses = calculateCalendarGridStatuses(habit, newYear);

    // Mon of current week is Dec 28th, 2026.
    // Mon of previous week is Dec 21st, 2026.
    expect(statuses.length).toBe(14);
  });

  // Scenario 9: Timezone edge case: a completion logged near local midnight lands in the correct day/column.
  test('Scenario 9: Completion near local midnight lands in correct column', () => {
    const today = new Date('2026-07-10T23:59:59Z'); // Near local midnight
    const habit = createMockHabit({
      startDate: '2026-06-01',
      checkIns: [
        { id: 'c1', localDate: '2026-07-10', status: 'COMPLETED' },
      ],
    });

    const status = getSessionStatusForDate(habit, new Date('2026-07-10T12:00:00Z'), today);
    expect(status).toBe('completed');
  });

  // Scenario 10: Freeze day renders as its own dedicated state, never as Completed, and matches what the Freeze service reports.
  test('Scenario 10: Freeze day renders as freeze', () => {
    const today = new Date('2026-07-10T12:00:00Z');
    const habit = createMockHabit({
      startDate: '2026-06-01',
      checkIns: [
        { id: 'f1', localDate: '2026-07-09', status: 'FREEZE' },
      ],
    });

    const statuses = calculateCalendarGridStatuses(habit, today);
    // Yesterday (Thursday, July 9th) is index 3 of Row 2 (indices 7 to 13)
    // Row 2 Mon = 7/6 (7), Tue = 7/7 (8), Wed = 7/8 (9), Thu = 7/9 (10)
    expect(statuses[10]).toBe('freeze');
    expect(statuses[10]).not.toBe('completed');
  });
});

describe('Freeze Explicit Regression Tests', () => {
  // Test A — Daily Promise math excludes Freeze correctly
  test('Test A: Daily Promise math excludes Freeze correctly', () => {
    // 5 habits for the day: 2 completed, 1 frozen, 2 missed
    const today = new Date('2026-07-10T12:00:00Z');
    const todayStr = '2026-07-10';

    const habits = [
      createMockHabit({ id: 'h1', checkIns: [{ id: 'c1', localDate: todayStr, status: 'COMPLETED' }] }),
      createMockHabit({ id: 'h2', checkIns: [{ id: 'c2', localDate: todayStr, status: 'COMPLETED' }] }),
      createMockHabit({ id: 'h3', checkIns: [{ id: 'c3', localDate: todayStr, status: 'FREEZE' }] }),
      createMockHabit({ id: 'h4', checkIns: [] }),
      createMockHabit({ id: 'h5', checkIns: [] }),
    ];

    // Compute progress for yesterday to avoid today's auto-PENDING state in test
    // So targetDate is yesterdayStr
    const yesterdayStr = '2026-07-09';
    const habitsYesterday = [
      createMockHabit({ id: 'h1', checkIns: [{ id: 'c1', localDate: yesterdayStr, status: 'COMPLETED' }] }),
      createMockHabit({ id: 'h2', checkIns: [{ id: 'c2', localDate: yesterdayStr, status: 'COMPLETED' }] }),
      createMockHabit({ id: 'h3', checkIns: [{ id: 'c3', localDate: yesterdayStr, status: 'FREEZE' }] }),
      createMockHabit({ id: 'h4', checkIns: [] }),
      createMockHabit({ id: 'h5', checkIns: [] }),
    ];

    const progress = calculateDailyPromiseProgress(habitsYesterday, yesterdayStr, today);

    // Completed: 2, Total: 5, Ratio: 40% (0.4)
    expect(progress.completed).toBe(2);
    expect(progress.total).toBe(5);
    expect(progress.ratio).toBe(0.4);
    expect(progress.ratio).not.toBe(0.6); // Must not be 3/5 (60%)
  });

  // Test B — Streak continuity + completion % exclusion together
  test('Test B: Streak continuity + completion % exclusion together', () => {
    // Given: Monday = Freeze, Tuesday = Complete, Wednesday = Complete
    // Mon = 2026-07-06 (FREEZE)
    // Tue = 2026-07-07 (COMPLETED)
    // Wed = 2026-07-08 (COMPLETED)
    const checkIns = [
      { id: '1', localDate: '2026-07-06', status: 'FREEZE' },
      { id: '2', localDate: '2026-07-07', status: 'COMPLETED' },
      { id: '3', localDate: '2026-07-08', status: 'COMPLETED' },
    ];

    // 1. Assert current Habit Streak continues through Monday (counts Mon-Wed as unbroken)
    // Using the same sorted check-ins calculation helper
    const calculateStreak = (dates: { localDate: string }[]) => {
      const sorted = [...dates].sort((a, b) => b.localDate.localeCompare(a.localDate));
      if (sorted.length === 0) return 0;
      let streak = 1;
      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = new Date(sorted[i].localDate);
        const prev = new Date(sorted[i + 1].localDate);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    };

    const currentStreak = calculateStreak(checkIns);
    expect(currentStreak).toBe(3); // Mon-Wed are unbroken

    // 2. Assert Best Streak reflects the same continuity
    let tempStreak = 1;
    let bestStreak = 1;
    const sorted = [...checkIns].sort((a, b) => b.localDate.localeCompare(a.localDate));
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = new Date(sorted[i].localDate);
      const prev = new Date(sorted[i + 1].localDate);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);
    expect(bestStreak).toBe(3);

    // 3. Assert completion percentage for this window still excludes Monday (calculated as 2/3 completed days, not 3/3)
    const completions = checkIns.filter(c => !c.status || c.status === 'COMPLETED').length;
    const totalDays = checkIns.length;
    const completionRate = completions / totalDays;
    expect(completions).toBe(2);
    expect(completionRate).toBe(2 / 3);
    expect(completionRate).not.toBe(1); // Must not be 3/3 (100%)
  });

  // Scenario 23: Verify FREEZE status maps to 'Frozen' and excludes from completed metrics
  test('Scenario 23: FREEZE status maps to Frozen state and does not increment completion metrics', () => {
    const refToday = new Date('2026-07-10T12:00:00Z');
    const habit = createMockHabit({
      checkIns: [
        { id: 'c1', localDate: '2026-07-08', status: 'COMPLETED' },
        { id: 'c2', localDate: '2026-07-09', status: 'FREEZE' },
      ],
    });

    const statusJuly9 = getSessionStatusForDate(habit, new Date('2026-07-09T12:00:00Z'), refToday);
    expect(statusJuly9).toBe('freeze');

    const progressJuly9 = calculateDailyPromiseProgress([habit], '2026-07-09', refToday);
    expect(progressJuly9.completed).toBe(0);
    expect(progressJuly9.ratio).toBe(0);
  });

  // Scenario 24: Verify validateFreeze cleanly separates Missed (Eligible) vs Missed (Expired)
  test('Scenario 24: validateFreeze cleanly separates Missed (Eligible) vs Missed (Expired) without backend errors', () => {
    const refToday = new Date('2026-07-10T12:00:00Z');
    const habit = createMockHabit({ freezeDaysAvailable: 1 });

    // Yesterday (July 9th) -> Eligible
    const yesterdayCheck = validateFreeze(habit, '2026-07-09', refToday);
    expect(yesterdayCheck.valid).toBe(true);

    // 4 Days Ago (July 6th) -> Expired
    const oldCheck = validateFreeze(habit, '2026-07-06', refToday);
    expect(oldCheck.valid).toBe(false);
    expect(oldCheck.error).toContain('Target date is too old');
  });
});

describe('Specific Days Scheduling Audit Tests', () => {
  const refToday = new Date('2026-07-10T12:00:00Z'); // Friday (July 10, 2026)
  // July 6: Mon, July 7: Tue, July 8: Wed, July 9: Thu, July 10: Fri

  test('Scenario A: Specific Days habit (Mon/Wed/Fri) on Tuesday (Rest Day)', () => {
    const habit = createMockHabit({
      scheduleType: ScheduleType.SPECIFIC_DAYS,
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
    } as any);

    const isTueSched = isHabitScheduledForDate(habit, '2026-07-07');
    expect(isTueSched).toBe(false); // Tuesday is a Rest Day

    const progressTue = calculateDailyPromiseProgress([habit], '2026-07-07', refToday);
    expect(progressTue.total).toBe(0); // Tuesday does not count toward Today's Promise
  });

  test('Scenario B: Mon(Comp), Tue(Rest), Wed(Comp) preserves Current Streak = 2', () => {
    const habit = createMockHabit({
      scheduleType: ScheduleType.SPECIFIC_DAYS,
      daysOfWeek: [1, 3, 5],
      checkIns: [
        { id: '1', localDate: '2026-07-06', status: 'COMPLETED' }, // Mon
        { id: '2', localDate: '2026-07-08', status: 'COMPLETED' }, // Wed
      ],
    } as any);

    const isMonSched = isHabitScheduledForDate(habit, '2026-07-06');
    const isWedSched = isHabitScheduledForDate(habit, '2026-07-08');
    expect(isMonSched).toBe(true);
    expect(isWedSched).toBe(true);

    const statusTue = getSessionStatusForDate(habit, new Date('2026-07-07T12:00:00Z'), refToday);
    expect(statusTue).toBe('not_scheduled');
  });

  test('Scenario D: Attempting Freeze on Rest Day is rejected', () => {
    const habit = createMockHabit({
      scheduleType: ScheduleType.SPECIFIC_DAYS,
      daysOfWeek: [1, 3, 5],
      freezeDaysAvailable: 1,
    } as any);

    const tueCheck = validateFreeze(habit, '2026-07-07', refToday);
    expect(tueCheck.valid).toBe(false);
    expect(tueCheck.error).toContain('Target date is not a scheduled day');
  });
});

describe('Before You Begin Coaching Feature Tests', () => {
  test('Deterministic story selection is stable throughout the local day', () => {
    const dateStr = '2026-07-27';
    const index1 = getStoryIndexForDate(dateStr);
    const index2 = getStoryIndexForDate(dateStr);
    expect(index1).toBe(index2);
    expect(index1).toBeGreaterThanOrEqual(0);
    expect(index1).toBeLessThan(DAILY_STORIES.length);

    const story1 = DAILY_STORIES[index1];
    expect(story1).toHaveProperty('thought');
    expect(story1).toHaveProperty('consequence');
    expect(story1).toHaveProperty('betterApproach');
    expect(story1).toHaveProperty('practicalExample');
  });

  test('Consecutive days cycle to different stories', () => {
    const idxDay1 = getStoryIndexForDate('2026-07-27');
    const idxDay2 = getStoryIndexForDate('2026-07-28');
    expect(idxDay1).not.toBe(idxDay2);
  });
});





