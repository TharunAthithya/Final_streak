import { StreakEngine } from './streak-engine';
import { ScheduleType } from '@prisma/client';

describe('StreakEngine', () => {
  describe('DAILY habits', () => {
    it('should calculate active daily streak completed today', () => {
      const startDate = new Date('2026-07-01');
      // completed today (2026-07-09), yesterday (08), day before (07)
      const checkInDates = ['2026-07-09', '2026-07-08', '2026-07-07'];
      const timezone = 'UTC';

      // Mock getLocalToday to return 2026-07-09
      jest.spyOn(StreakEngine, 'getLocalToday').mockReturnValue('2026-07-09');

      const result = StreakEngine.calculate(
        ScheduleType.DAILY,
        startDate,
        checkInDates,
        timezone
      );

      expect(result.currentStreak).toBe(3);
      expect(result.bestStreak).toBe(3);
      expect(result.totalCompletions).toBe(3);
      expect(result.completionRate).toBe(33.33); // 3 out of 9 days elapsed (01 to 09)
    });

    it('should maintain streak active if completed yesterday but not yet today', () => {
      const startDate = new Date('2026-07-01');
      // completed yesterday (08), day before (07)
      const checkInDates = ['2026-07-08', '2026-07-07'];
      const timezone = 'UTC';

      jest.spyOn(StreakEngine, 'getLocalToday').mockReturnValue('2026-07-09');

      const result = StreakEngine.calculate(
        ScheduleType.DAILY,
        startDate,
        checkInDates,
        timezone
      );

      expect(result.currentStreak).toBe(2);
    });

    it('should break streak if last check-in was 2 days ago', () => {
      const startDate = new Date('2026-07-01');
      const checkInDates = ['2026-07-07', '2026-07-06'];
      const timezone = 'UTC';

      jest.spyOn(StreakEngine, 'getLocalToday').mockReturnValue('2026-07-09');

      const result = StreakEngine.calculate(
        ScheduleType.DAILY,
        startDate,
        checkInDates,
        timezone
      );

      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(2);
    });

    it('should handle year boundaries correctly', () => {
      const startDate = new Date('2025-12-25');
      const checkInDates = ['2026-01-02', '2026-01-01', '2025-12-31', '2025-12-30'];
      const timezone = 'UTC';

      jest.spyOn(StreakEngine, 'getLocalToday').mockReturnValue('2026-01-02');

      const result = StreakEngine.calculate(
        ScheduleType.DAILY,
        startDate,
        checkInDates,
        timezone
      );

      expect(result.currentStreak).toBe(4);
    });
  });

  describe('SPECIFIC_DAYS habits', () => {
    it('should calculate streak based on scheduled days of the week', () => {
      const startDate = new Date('2026-07-01'); // Wednesday
      // Scheduled: Monday (1), Wednesday (3), Friday (5)
      // Check-ins on Friday (03), Wednesday (01)
      const checkInDates = ['2026-07-03', '2026-07-01']; 
      const scheduledDays = [1, 3, 5];

      jest.spyOn(StreakEngine, 'getLocalToday').mockReturnValue('2026-07-04'); // Saturday

      const result = StreakEngine.calculate(
        ScheduleType.SPECIFIC_DAYS,
        startDate,
        checkInDates,
        'UTC',
        scheduledDays
      );

      expect(result.currentStreak).toBe(2);
      expect(result.completionRate).toBe(100.00); // 2 completions out of 2 scheduled days (Wed 01, Fri 03)
    });
  });
});
