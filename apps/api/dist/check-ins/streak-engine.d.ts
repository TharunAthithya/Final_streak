import { ScheduleType } from '@prisma/client';
export interface StreakStats {
    currentStreak: number;
    bestStreak: number;
    totalCompletions: number;
    completionRate: number;
}
export declare class StreakEngine {
    static toDateString(date: Date): string;
    static getDaysDiff(dateStr1: string, dateStr2: string): number;
    static getLocalToday(timezone: string): string;
    static calculate(scheduleType: ScheduleType, startDate: Date, checkInDates: string[], timezone: string, scheduledDaysOfWeek?: number[], targetPerWeek?: number): StreakStats;
}
