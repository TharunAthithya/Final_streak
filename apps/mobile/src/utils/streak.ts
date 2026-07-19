import { HabitResponse } from '@streak/contracts';

export interface DailyProgress {
  completed: number;
  total: number;
  ratio: number;
  status: 'SUCCESS' | 'FAILED' | 'NEUTRAL' | 'PENDING';
}

/**
 * Normalizes a Date or date string to a midnight Date in local time.
 */
export function normalizeToLocalMidnight(date: Date | string): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Formats a Date or date string into YYYY-MM-DD in local time.
 */
export function toLocalDateString(date: Date | string): string {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Helper function to determine if a habit is active and scheduled for a specific date.
 * Excludes paused, archived, deleted, or unstarted habits.
 */
export function isHabitScheduledForDate(habit: HabitResponse, date: Date | string): boolean {
  // Only active habits (non-archived, non-paused/deleted in future schema)
  if (habit.status !== 'ACTIVE') return false;

  const targetMidnight = normalizeToLocalMidnight(date);
  const startMidnight = normalizeToLocalMidnight(habit.startDate);

  // Exclude if target date is prior to habit start date
  if (targetMidnight < startMidnight) return false;

  // Exclude if habit was archived before the target date
  if (habit.archivedAt) {
    const archiveMidnight = normalizeToLocalMidnight(habit.archivedAt);
    if (targetMidnight >= archiveMidnight) return false;
  }

  // Check week days schedule
  const targetDayOfWeek = targetMidnight.getDay(); // 0 = Sunday, 6 = Saturday
  if (habit.scheduleType === 'DAILY') {
    return true;
  } else if (habit.scheduleType === 'SPECIFIC_DAYS' && (habit as any).daysOfWeek) {
    return (habit as any).daysOfWeek.includes(targetDayOfWeek);
  }

  return false;
}

/**
 * Returns a clean, human-readable representation of the habit schedule.
 */
export function getHabitScheduleLabel(habit: HabitResponse): string {
  if (habit.scheduleType === 'DAILY') {
    return 'Every Day';
  }
  if (habit.scheduleType === 'SPECIFIC_DAYS' && (habit as any).daysOfWeek) {
    const days: number[] = (habit as any).daysOfWeek;
    if (days.length === 0) return 'No days';
    if (days.length === 7) return 'Every Day';

    // Check for Weekdays (Mon-Fri: 1, 2, 3, 4, 5)
    const isWeekdays = days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d));
    if (isWeekdays) return 'Weekdays';

    // Check for Weekends (Sat, Sun: 0, 6)
    const isWeekends = days.length === 2 && [0, 6].every(d => days.includes(d));
    if (isWeekends) return 'Weekends';

    const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Sort days to ensure they print in Sun-Sat chronological order (or Mon-Sun if preferred, let's stick to Sun-Sat matching the indices 0..6)
    const sortedDays = [...days].sort((a, b) => a - b);
    return sortedDays.map(d => dayNamesShort[d]).join(' • ');
  }
  return 'Flexible';
}

/**
 * Calculates the Daily Promise Progress for a specific calendar date.
 */
export function calculateDailyPromiseProgress(
  habits: HabitResponse[],
  targetDate: Date | string,
  today: Date = new Date()
): DailyProgress {
  const targetMidnight = normalizeToLocalMidnight(targetDate);
  const targetDateStr = toLocalDateString(targetMidnight);
  const todayDateStr = toLocalDateString(today);

  let total = 0;
  let completed = 0;

  for (const habit of habits) {
    if (isHabitScheduledForDate(habit, targetMidnight)) {
      total++;
      const isCompleted = habit.checkIns?.some((c) => c.localDate === targetDateStr) || false;
      if (isCompleted) {
        completed++;
      }
    }
  }

  if (total === 0) {
    return { completed: 0, total: 0, ratio: 0, status: 'NEUTRAL' };
  }

  const ratio = completed / total;
  const isToday = targetDateStr === todayDateStr;

  let status: 'SUCCESS' | 'FAILED' | 'NEUTRAL' | 'PENDING';
  if (isToday) {
    status = 'PENDING';
  } else if (ratio >= 0.5) {
    status = 'SUCCESS';
  } else {
    status = 'FAILED';
  }

  return { completed, total, ratio, status };
}

/**
 * Calculates the Global Streak by walking backward day-by-day.
 */
export function calculateGlobalStreak(
  habits: HabitResponse[],
  today: Date = new Date()
): number {
  if (!habits || habits.length === 0) return 0;

  let currentDay = new Date(today);
  let streak = 0;

  const earliestStartDate = habits.reduce((acc, h) => {
    const d = new Date(h.startDate);
    return d < acc ? d : acc;
  }, new Date());
  
  const earliestMidnight = normalizeToLocalMidnight(earliestStartDate);
  let iterations = 0;
  
  while (iterations < 1000) {
    iterations++;
    const currentMidnight = normalizeToLocalMidnight(currentDay);
    if (currentMidnight < earliestMidnight) {
      break;
    }

    const progress = calculateDailyPromiseProgress(habits, currentMidnight, today);

    if (progress.status === 'SUCCESS') {
      streak++;
    } else if (progress.status === 'FAILED') {
      break;
    }

    currentDay.setDate(currentDay.getDate() - 1);
  }

  return streak;
}
