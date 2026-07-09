"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const streak_engine_1 = require("./streak-engine");
const client_1 = require("@prisma/client");
describe('StreakEngine', () => {
    describe('DAILY habits', () => {
        it('should calculate active daily streak completed today', () => {
            const startDate = new Date('2026-07-01');
            const checkInDates = ['2026-07-09', '2026-07-08', '2026-07-07'];
            const timezone = 'UTC';
            jest.spyOn(streak_engine_1.StreakEngine, 'getLocalToday').mockReturnValue('2026-07-09');
            const result = streak_engine_1.StreakEngine.calculate(client_1.ScheduleType.DAILY, startDate, checkInDates, timezone);
            expect(result.currentStreak).toBe(3);
            expect(result.bestStreak).toBe(3);
            expect(result.totalCompletions).toBe(3);
            expect(result.completionRate).toBe(33.33);
        });
        it('should maintain streak active if completed yesterday but not yet today', () => {
            const startDate = new Date('2026-07-01');
            const checkInDates = ['2026-07-08', '2026-07-07'];
            const timezone = 'UTC';
            jest.spyOn(streak_engine_1.StreakEngine, 'getLocalToday').mockReturnValue('2026-07-09');
            const result = streak_engine_1.StreakEngine.calculate(client_1.ScheduleType.DAILY, startDate, checkInDates, timezone);
            expect(result.currentStreak).toBe(2);
        });
        it('should break streak if last check-in was 2 days ago', () => {
            const startDate = new Date('2026-07-01');
            const checkInDates = ['2026-07-07', '2026-07-06'];
            const timezone = 'UTC';
            jest.spyOn(streak_engine_1.StreakEngine, 'getLocalToday').mockReturnValue('2026-07-09');
            const result = streak_engine_1.StreakEngine.calculate(client_1.ScheduleType.DAILY, startDate, checkInDates, timezone);
            expect(result.currentStreak).toBe(0);
            expect(result.bestStreak).toBe(2);
        });
        it('should handle year boundaries correctly', () => {
            const startDate = new Date('2025-12-25');
            const checkInDates = ['2026-01-02', '2026-01-01', '2025-12-31', '2025-12-30'];
            const timezone = 'UTC';
            jest.spyOn(streak_engine_1.StreakEngine, 'getLocalToday').mockReturnValue('2026-01-02');
            const result = streak_engine_1.StreakEngine.calculate(client_1.ScheduleType.DAILY, startDate, checkInDates, timezone);
            expect(result.currentStreak).toBe(4);
        });
    });
    describe('SPECIFIC_DAYS habits', () => {
        it('should calculate streak based on scheduled days of the week', () => {
            const startDate = new Date('2026-07-01');
            const checkInDates = ['2026-07-03', '2026-07-01'];
            const scheduledDays = [1, 3, 5];
            jest.spyOn(streak_engine_1.StreakEngine, 'getLocalToday').mockReturnValue('2026-07-04');
            const result = streak_engine_1.StreakEngine.calculate(client_1.ScheduleType.SPECIFIC_DAYS, startDate, checkInDates, 'UTC', scheduledDays);
            expect(result.currentStreak).toBe(2);
            expect(result.completionRate).toBe(100.00);
        });
    });
});
//# sourceMappingURL=streak-engine.spec.js.map