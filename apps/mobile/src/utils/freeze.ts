import { HabitResponse } from '@streak/contracts';
import { isHabitScheduledForDate, toLocalDateString, normalizeToLocalMidnight } from './streak';

export type ExtendedSessionStatus = 'completed' | 'freeze' | 'missed' | 'pending' | 'not_scheduled';

/**
 * Checks if the habit is eligible for a Freeze reset (7 days since last reset).
 * If yes, regenerates the available freeze to 1.
 */
export function checkAndRegenerateFreeze(habit: HabitResponse): { freezeDaysAvailable: number; lastFreezeReset: string; modified: boolean } {
  const now = new Date();
  const lastReset = new Date(habit.lastFreezeReset || habit.createdAt);
  const diffTime = now.getTime() - lastReset.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays >= 7) {
    return {
      freezeDaysAvailable: 1,
      lastFreezeReset: now.toISOString(),
      modified: true,
    };
  }

  return {
    freezeDaysAvailable: habit.freezeDaysAvailable !== undefined ? habit.freezeDaysAvailable : 1,
    lastFreezeReset: habit.lastFreezeReset || habit.createdAt,
    modified: false,
  };
}

/**
 * Validates whether a freeze can be applied to the target date.
 */
export function validateFreeze(
  habit: HabitResponse,
  targetDateStr: string,
  today: Date = new Date()
): { valid: boolean; error?: string } {
  // 1. Check availability
  const regenerated = checkAndRegenerateFreeze(habit);
  const available = regenerated.freezeDaysAvailable;
  if (available < 1) {
    return { valid: false, error: 'No freeze days available' };
  }

  // 2. Validate targetDate is within previous 3 calendar days (yesterday, 2, or 3 days ago)
  const todayMidnight = normalizeToLocalMidnight(today);
  
  const yesterday = new Date(todayMidnight);
  yesterday.setDate(yesterday.getDate() - 1);
  const day2 = new Date(todayMidnight);
  day2.setDate(day2.getDate() - 2);
  const day3 = new Date(todayMidnight);
  day3.setDate(day3.getDate() - 3);

  const allowedDates = [
    toLocalDateString(yesterday),
    toLocalDateString(day2),
    toLocalDateString(day3),
  ];

  if (!allowedDates.includes(targetDateStr)) {
    const targetMidnight = normalizeToLocalMidnight(targetDateStr);
    if (targetMidnight > todayMidnight) {
      return { valid: false, error: 'Target date cannot be in the future' };
    }
    return { valid: false, error: 'Target date is too old' };
  }

  // 3. Validate targetDate is a scheduled day for the habit
  const targetDate = new Date(targetDateStr);
  if (!isHabitScheduledForDate(habit, targetDate)) {
    return { valid: false, error: 'Target date is not a scheduled day' };
  }

  // 4. Validate no existing COMPLETED or FREEZE entry
  const existing = habit.checkIns?.find((c) => c.localDate === targetDateStr);
  if (existing) {
    return { valid: false, error: 'Target date already has a completion or freeze' };
  }

  return { valid: true };
}

/**
 * Calculates the session status history for the past `numDays`.
 */
export function calculateSessionStatuses(
  habit: HabitResponse,
  numDays = 14,
  today: Date = new Date()
): ExtendedSessionStatus[] {
  const statuses: ExtendedSessionStatus[] = [];
  const todayStr = toLocalDateString(today);
  const todayMidnight = normalizeToLocalMidnight(today);

  for (let i = 0; i < numDays; i++) {
    const currentDay = new Date(todayMidnight);
    currentDay.setDate(todayMidnight.getDate() - i);
    const dayStr = toLocalDateString(currentDay);

    // Find check-in for this day
    const checkIn = habit.checkIns?.find((c) => c.localDate === dayStr);
    const isScheduled = isHabitScheduledForDate(habit, currentDay);

    if (checkIn) {
      if (checkIn.status === 'FREEZE') {
        statuses.push('freeze');
      } else {
        statuses.push('completed');
      }
    } else {
      if (!isScheduled) {
        statuses.push('not_scheduled');
      } else {
        if (dayStr === todayStr) {
          statuses.push('pending');
        } else if (currentDay > todayMidnight) {
          statuses.push('pending');
        } else {
          statuses.push('missed');
        }
      }
    }
  }

  // Return chronological order (oldest to newest)
  return statuses.reverse();
}

/**
 * Finds the latest date in the previous 3 days that was scheduled but not checked in or frozen.
 */
export function getLatestFreezableDate(habit: HabitResponse, today: Date = new Date()): string | null {
  const todayMidnight = normalizeToLocalMidnight(today);
  for (let i = 1; i <= 3; i++) {
    const currentDay = new Date(todayMidnight);
    currentDay.setDate(todayMidnight.getDate() - i);
    const dayStr = toLocalDateString(currentDay);

    // Is it scheduled?
    if (isHabitScheduledForDate(habit, currentDay)) {
      // Is there any check-in?
      const checked = habit.checkIns?.some((c) => c.localDate === dayStr);
      if (!checked) {
        return dayStr;
      }
    }
  }
  return null;
}

export type SessionStatus = 'completed' | 'freeze' | 'missed' | 'pending' | 'not_scheduled';

/**
 * Returns the status of a habit for a specific calendar date.
 */
export function getSessionStatusForDate(
  habit: HabitResponse,
  date: Date,
  today: Date = new Date()
): SessionStatus {
  const dayStr = toLocalDateString(date);
  const todayStr = toLocalDateString(today);
  const dateMidnight = normalizeToLocalMidnight(date);
  const todayMidnight = normalizeToLocalMidnight(today);

  // Find check-in
  const checkIn = habit.checkIns?.find((c) => c.localDate === dayStr);
  const isScheduled = isHabitScheduledForDate(habit, date);

  if (checkIn) {
    if (checkIn.status === 'FREEZE') {
      return 'freeze';
    } else {
      return 'completed';
    }
  } else {
    if (!isScheduled) {
      return 'not_scheduled';
    } else {
      if (dateMidnight > todayMidnight) {
        return 'pending'; // Upcoming
      } else if (dayStr === todayStr) {
        return 'pending'; // Today is still pending
      } else {
        return 'missed';
      }
    }
  }
}

/**
 * Calculates the 14-day rolling grid statuses (previous week Mon-Sun and current week Mon-Sun).
 */
export function calculateCalendarGridStatuses(
  habit: HabitResponse,
  today: Date = new Date()
): SessionStatus[] {
  const todayMidnight = normalizeToLocalMidnight(today);
  
  // Find Monday of the current week
  const day = todayMidnight.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToMonday = day === 0 ? -6 : 1 - day;
  const currentWeekMonday = new Date(todayMidnight);
  currentWeekMonday.setDate(todayMidnight.getDate() + daysToMonday);

  // Monday of the previous week
  const prevWeekMonday = new Date(currentWeekMonday);
  prevWeekMonday.setDate(prevWeekMonday.getDate() - 7);

  const statuses: SessionStatus[] = [];

  // Generate Row 1 (previous week: Monday -> Sunday)
  for (let i = 0; i < 7; i++) {
    const date = new Date(prevWeekMonday);
    date.setDate(prevWeekMonday.getDate() + i);
    statuses.push(getSessionStatusForDate(habit, date, todayMidnight));
  }

  // Generate Row 2 (current week: Monday -> Sunday)
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekMonday);
    date.setDate(currentWeekMonday.getDate() + i);
    statuses.push(getSessionStatusForDate(habit, date, todayMidnight));
  }

  return statuses;
}

/**
 * Calculates the exact 14 calendar dates (YYYY-MM-DD) for the rolling grid.
 */
export function getCalendarGridDates(today: Date = new Date()): string[] {
  const todayMidnight = normalizeToLocalMidnight(today);
  const day = todayMidnight.getDay();
  const daysToMonday = day === 0 ? -6 : 1 - day;
  const currentWeekMonday = new Date(todayMidnight);
  currentWeekMonday.setDate(todayMidnight.getDate() + daysToMonday);

  const prevWeekMonday = new Date(currentWeekMonday);
  prevWeekMonday.setDate(prevWeekMonday.getDate() - 7);

  const dates: string[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(prevWeekMonday);
    date.setDate(prevWeekMonday.getDate() + i);
    dates.push(toLocalDateString(date));
  }

  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekMonday);
    date.setDate(currentWeekMonday.getDate() + i);
    dates.push(toLocalDateString(date));
  }

  return dates;
}
