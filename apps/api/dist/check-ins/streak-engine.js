"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreakEngine = void 0;
const client_1 = require("@prisma/client");
class StreakEngine {
    static toDateString(date) {
        return date.toISOString().split('T')[0];
    }
    static getDaysDiff(dateStr1, dateStr2) {
        const d1 = new Date(dateStr1);
        const d2 = new Date(dateStr2);
        const diffTime = Math.abs(d1.getTime() - d2.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    static getLocalToday(timezone) {
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
        }
        catch {
            return this.toDateString(new Date());
        }
    }
    static calculate(scheduleType, startDate, checkInDates, timezone, scheduledDaysOfWeek = [], targetPerWeek = 1) {
        const totalCompletions = checkInDates.length;
        if (totalCompletions === 0) {
            return { currentStreak: 0, bestStreak: 0, totalCompletions: 0, completionRate: 0.00 };
        }
        const todayStr = this.getLocalToday(timezone);
        const startStr = this.toDateString(startDate);
        let currentStreak = 0;
        let bestStreak = 0;
        if (scheduleType === client_1.ScheduleType.DAILY) {
            const lastCheckIn = checkInDates[0];
            const diffFromToday = this.getDaysDiff(todayStr, lastCheckIn);
            if (diffFromToday <= 1) {
                currentStreak = 1;
                for (let i = 0; i < checkInDates.length - 1; i++) {
                    const diff = this.getDaysDiff(checkInDates[i], checkInDates[i + 1]);
                    if (diff === 1) {
                        currentStreak++;
                    }
                    else if (diff > 1) {
                        break;
                    }
                }
            }
            let tempStreak = 1;
            bestStreak = 1;
            for (let i = 0; i < checkInDates.length - 1; i++) {
                const diff = this.getDaysDiff(checkInDates[i], checkInDates[i + 1]);
                if (diff === 1) {
                    tempStreak++;
                }
                else if (diff > 1) {
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
        }
        else if (scheduleType === client_1.ScheduleType.SPECIFIC_DAYS) {
            const sched = new Set(scheduledDaysOfWeek);
            const scheduledDates = [];
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
            let active = true;
            let startIndex = 0;
            if (scheduledDates.length > 0) {
                const latestScheduled = scheduledDates[0];
                if (!completedSet.has(latestScheduled)) {
                    if (latestScheduled === todayStr) {
                        startIndex = 1;
                    }
                    else {
                        active = false;
                    }
                }
                if (active) {
                    for (let i = startIndex; i < scheduledDates.length; i++) {
                        if (completedSet.has(scheduledDates[i])) {
                            currentStreak++;
                        }
                        else {
                            break;
                        }
                    }
                }
            }
            let tempStreak = 0;
            for (let i = 0; i < scheduledDates.length; i++) {
                if (completedSet.has(scheduledDates[i])) {
                    tempStreak++;
                    if (tempStreak > bestStreak) {
                        bestStreak = tempStreak;
                    }
                }
                else {
                    tempStreak = 0;
                }
            }
            if (currentStreak > bestStreak) {
                bestStreak = currentStreak;
            }
        }
        else if (scheduleType === client_1.ScheduleType.FLEXIBLE) {
            const getWeekKey = (dateStr) => {
                const date = new Date(dateStr);
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(date.setDate(diff));
                return this.toDateString(monday);
            };
            const completionsPerWeek = {};
            checkInDates.forEach((dateStr) => {
                const weekKey = getWeekKey(dateStr);
                completionsPerWeek[weekKey] = (completionsPerWeek[weekKey] || 0) + 1;
            });
            const weekKeys = [];
            const current = new Date(todayStr);
            const start = new Date(startStr);
            const currentDay = current.getDay();
            current.setDate(current.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
            const startDay = start.getDay();
            start.setDate(start.getDate() - startDay + (startDay === 0 ? -6 : 1));
            while (current >= start) {
                weekKeys.push(this.toDateString(current));
                current.setDate(current.getDate() - 7);
            }
            let active = true;
            let startIndex = 0;
            if (weekKeys.length > 0) {
                const currentWeekKey = weekKeys[0];
                const currentWeekCount = completionsPerWeek[currentWeekKey] || 0;
                if (currentWeekCount < targetPerWeek) {
                    startIndex = 1;
                }
                else {
                    currentStreak = 1;
                    startIndex = 1;
                }
                for (let i = startIndex; i < weekKeys.length; i++) {
                    const count = completionsPerWeek[weekKeys[i]] || 0;
                    if (count >= targetPerWeek) {
                        currentStreak++;
                    }
                    else {
                        break;
                    }
                }
            }
            let tempStreak = 0;
            for (let i = 0; i < weekKeys.length; i++) {
                const count = completionsPerWeek[weekKeys[i]] || 0;
                if (count >= targetPerWeek) {
                    tempStreak++;
                    if (tempStreak > bestStreak) {
                        bestStreak = tempStreak;
                    }
                }
                else {
                    tempStreak = 0;
                }
            }
            if (currentStreak > bestStreak) {
                bestStreak = currentStreak;
            }
        }
        const elapsedDays = Math.max(1, this.getDaysDiff(todayStr, startStr) + 1);
        let completionRate = 0.00;
        if (scheduleType === client_1.ScheduleType.DAILY) {
            completionRate = Number(((totalCompletions / elapsedDays) * 100).toFixed(2));
        }
        else if (scheduleType === client_1.ScheduleType.SPECIFIC_DAYS) {
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
        }
        else {
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
exports.StreakEngine = StreakEngine;
//# sourceMappingURL=streak-engine.js.map