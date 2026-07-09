import { ScheduleType } from '@prisma/client';

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate: number;
}

export class StreakEngine {
  /**
   * Helper to format Date objects or string dates to YYYY-MM-DD
   */
  static toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculates difference in days between two YYYY-MM-DD dates
   */
  static getDaysDiff(dateStr1: string, dateStr2: string): number {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    const diffTime = Math.abs(d1.getTime() - d2.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Gets the local date string for a timezone
   */
  static getLocalToday(timezone: string): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = formatter.formatToParts(new Date());
      const year = parts.find((p) => p.type === 'year')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      return `${year}-${month}-${day}`;
    } catch {
      return this.toDateString(new Date());
    }
  }

  /**
   * Main calculation engine
   */
  static calculate(
    scheduleType: ScheduleType,
    startDate: Date,
    checkInDates: string[], // Sorted descending YYYY-MM-DD
    timezone: string,
    scheduledDaysOfWeek: number[] = [], // 0 = Sun, 6 = Sat
    targetPerWeek = 1,
  ): StreakStats {
    const totalCompletions = checkInDates.length;
    if (totalCompletions === 0) {
      return { currentStreak: 0, bestStreak: 0, totalCompletions: 0, completionRate: 0.00 };
    }

    const todayStr = this.getLocalToday(timezone);
    const startStr = this.toDateString(startDate);

    let currentStreak = 0;
    let bestStreak = 0;

    if (scheduleType === ScheduleType.DAILY) {
      // 1. Calculate Current Streak
      const lastCheckIn = checkInDates[0];
      const diffFromToday = this.getDaysDiff(todayStr, lastCheckIn);

      if (diffFromToday <= 1) {
        currentStreak = 1;
        for (let i = 0; i < checkInDates.length - 1; i++) {
          const diff = this.getDaysDiff(checkInDates[i], checkInDates[i + 1]);
          if (diff === 1) {
            currentStreak++;
          } else if (diff > 1) {
            break;
          }
        }
      }

      // 2. Calculate Best Streak
      let tempStreak = 1;
      bestStreak = 1;
      for (let i = 0; i < checkInDates.length - 1; i++) {
        const diff = this.getDaysDiff(checkInDates[i], checkInDates[i + 1]);
        if (diff === 1) {
          tempStreak++;
        } else if (diff > 1) {
          if (tempStreak > bestStreak) {
            bestStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else if (scheduleType === ScheduleType.SPECIFIC_DAYS) {
      // Sort scheduled days (0-6)
      const sched = new Set(scheduledDaysOfWeek);

      // Generate all scheduled calendar dates between startDate and todayStr (in descending order)
      const scheduledDates: string[] = [];
      const current = new Date(todayStr);
      const start = new Date(startStr);

      while (current >= start) {
        const day = current.getDay();
        if (sched.has(day)) {
          scheduledDates.push(this.toDateString(current));
        }
        current.setDate(current.getDate() - 1);
      }

      const completedSet = new Set(checkInDates);

      // Calculate Current Streak
      // If the most recent scheduled date (today) is not checked in, we check the one before it.
      let active = true;
      let startIndex = 0;

      if (scheduledDates.length > 0) {
        const latestScheduled = scheduledDates[0];
        if (!completedSet.has(latestScheduled)) {
          // If latest is today and not completed yet, the streak remains active from previous scheduled day
          if (latestScheduled === todayStr) {
            startIndex = 1;
          } else {
            active = false;
          }
        }

        if (active) {
          for (let i = startIndex; i < scheduledDates.length; i++) {
            if (completedSet.has(scheduledDates[i])) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }

      // Calculate Best Streak
      let tempStreak = 0;
      for (let i = 0; i < scheduledDates.length; i++) {
        if (completedSet.has(scheduledDates[i])) {
          tempStreak++;
          if (tempStreak > bestStreak) {
            bestStreak = tempStreak;
          }
        } else {
          tempStreak = 0;
        }
      }
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else if (scheduleType === ScheduleType.FLEXIBLE) {
      // Flexible: streak represents consecutive weeks where weekly target was met.
      // Group completions by ISO week (Monday-Sunday)
      const getWeekKey = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        const monday = new Date(date.setDate(diff));
        return this.toDateString(monday);
      };

      const completionsPerWeek: Record<string, number> = {};
      checkInDates.forEach((dateStr) => {
        const weekKey = getWeekKey(dateStr);
        completionsPerWeek[weekKey] = (completionsPerWeek[weekKey] || 0) + 1;
      });

      // Generate all weeks from start date to today
      const weekKeys: string[] = [];
      const current = new Date(todayStr);
      const start = new Date(startStr);
      
      // Go to Monday of current week
      const currentDay = current.getDay();
      current.setDate(current.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
      
      const startDay = start.getDay();
      start.setDate(start.getDate() - startDay + (startDay === 0 ? -6 : 1));

      while (current >= start) {
        weekKeys.push(this.toDateString(current));
        current.setDate(current.getDate() - 7);
      }

      // Calculate current streak of weeks
      let active = true;
      let startIndex = 0;

      if (weekKeys.length > 0) {
        const currentWeekKey = weekKeys[0];
        const currentWeekCount = completionsPerWeek[currentWeekKey] || 0;

        if (currentWeekCount < targetPerWeek) {
          // If current week is not finished, it doesn't break the streak unless it is already impossible to achieve (or we allow it to keep streak if previous week was successful)
          startIndex = 1; // Count from last week
        } else {
          currentStreak = 1;
          startIndex = 1;
        }

        for (let i = startIndex; i < weekKeys.length; i++) {
          const count = completionsPerWeek[weekKeys[i]] || 0;
          if (count >= targetPerWeek) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate best streak of weeks
      let tempStreak = 0;
      for (let i = 0; i < weekKeys.length; i++) {
        const count = completionsPerWeek[weekKeys[i]] || 0;
        if (count >= targetPerWeek) {
          tempStreak++;
          if (tempStreak > bestStreak) {
            bestStreak = tempStreak;
          }
        } else {
          tempStreak = 0;
        }
      }
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    }

    // 3. Completion Rate
    // completions / total days elapsed since start (or total scheduled days)
    const elapsedDays = Math.max(1, this.getDaysDiff(todayStr, startStr) + 1);
    let completionRate = 0.00;

    if (scheduleType === ScheduleType.DAILY) {
      completionRate = Number(((totalCompletions / elapsedDays) * 100).toFixed(2));
    } else if (scheduleType === ScheduleType.SPECIFIC_DAYS) {
      const sched = new Set(scheduledDaysOfWeek);
      let scheduledCount = 0;
      const current = new Date(todayStr);
      const start = new Date(startStr);
      while (current >= start) {
        if (sched.has(current.getDay())) {
          scheduledCount++;
        }
        current.setDate(current.getDate() - 1);
      }
      scheduledCount = Math.max(1, scheduledCount);
      completionRate = Number(((totalCompletions / scheduledCount) * 100).toFixed(2));
    } else {
      completionRate = Number(((totalCompletions / elapsedDays) * 100).toFixed(2));
    }

    return {
      currentStreak,
      bestStreak,
      totalCompletions,
      completionRate: Math.min(100.00, completionRate),
    };
  }
}
