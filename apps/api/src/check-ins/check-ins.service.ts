import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from '@streak/validation';
import { StreakEngine } from './streak-engine';
import { ActivityType, RoomVisibility } from '@prisma/client';

@Injectable()
export class CheckInsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(userId: string, habitId: string, dto: CheckInDto) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: { scheduleDays: true },
    });

    if (!habit) throw new NotFoundException('Habit not found');
    if (habit.userId !== userId) throw new ForbiddenException('You do not own this habit');

    // 1. Transaction to handle idempotency, check-in, stats, XP, and Room Activity
    return this.prisma.$transaction(async (tx) => {
      // Check idempotency key to prevent double completions
      const existing = await tx.checkIn.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        throw new ConflictException('Habit already completed for this date (Idempotency trigger)');
      }

      // Check if user already completed this habit on this date without matching idempotency key
      const localDateObj = new Date(dto.localDate);
      const duplicateLocalDate = await tx.checkIn.findFirst({
        where: {
          habitId,
          localDate: localDateObj,
        },
      });
      if (duplicateLocalDate) {
        throw new ConflictException('Habit already completed for this date');
      }

      // Create check-in
      const checkIn = await tx.checkIn.create({
        data: {
          userId,
          habitId,
          localDate: localDateObj,
          completedAtUtc: new Date(),
          timezoneAtCompletion: dto.timezoneAtCompletion,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      // Get all check-in dates for calculation
      const allCheckIns = await tx.checkIn.findMany({
        where: { habitId },
        select: { localDate: true },
        orderBy: { localDate: 'desc' },
      });

      const dates = allCheckIns.map((c) => c.localDate.toISOString().split('T')[0]);

      // Calculate stats using StreakEngine
      const computed = StreakEngine.calculate(
        habit.scheduleType,
        habit.startDate,
        dates,
        dto.timezoneAtCompletion,
        habit.scheduleDays.map((d) => d.dayOfWeek),
        habit.targetPerWeek || 1,
      );

      // Update stats
      const stats = await tx.habitStats.update({
        where: { habitId },
        data: {
          currentStreak: computed.currentStreak,
          bestStreak: computed.bestStreak,
          totalCompletions: computed.totalCompletions,
          completionRate: computed.completionRate,
          recalculatedAt: new Date(),
        },
      });

      // Gamification: Award 10 XP
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const xpEarned = 10;
      const newXp = user.xp + xpEarned;
      const newLevel = Math.floor(newXp / 100) + 1;
      const levelUp = newLevel > user.level;

      await tx.user.update({
        where: { id: userId },
        data: {
          xp: newXp,
          level: newLevel,
        },
      });

      // Social Accountability: Generate activity feeds for active linked rooms
      // Fetch all active links (unlinked_at is NULL) for this habit
      const activeLinks = await tx.roomHabitLink.findMany({
        where: {
          personalHabitId: habitId,
          unlinkedAt: null,
          roomMember: {
            leftAt: null, // Ensure member has not left the room
          },
        },
        include: {
          roomMember: {
            include: {
              room: true,
            },
          },
        },
      });

      for (const link of activeLinks) {
        const room = link.roomMember.room;
        const msg = `${user.displayName} completed "${habit.name}" satisfying target "${room.name}" (Streak: ${stats.currentStreak} days)`;

        await tx.activity.create({
          data: {
            actorUserId: userId,
            roomId: room.id,
            roomHabitLinkId: link.id,
            type: ActivityType.HABIT_COMPLETED,
            message: msg,
            visibility: room.visibility,
            deduplicationKey: `${userId}:${habitId}:${dto.localDate}:${room.id}`,
            metadataJson: {
              habitName: habit.name,
              currentStreak: stats.currentStreak,
              localDate: dto.localDate,
            },
          },
        });
      }

      return {
        checkIn,
        stats,
        xpAwarded: xpEarned,
        levelUp,
      };
    });
  }

  async undoCheckIn(userId: string, habitId: string, checkInId: string) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: { scheduleDays: true },
    });

    if (!habit) throw new NotFoundException('Habit not found');
    if (habit.userId !== userId) throw new ForbiddenException('You do not own this habit');

    return this.prisma.$transaction(async (tx) => {
      const checkIn = await tx.checkIn.findUnique({ where: { id: checkInId } });
      if (!checkIn) throw new NotFoundException('Check-in not found');

      // Delete Check-in
      await tx.checkIn.delete({ where: { id: checkInId } });

      // Recalculate stats
      const allCheckIns = await tx.checkIn.findMany({
        where: { habitId },
        select: { localDate: true },
        orderBy: { localDate: 'desc' },
      });

      const dates = allCheckIns.map((c) => c.localDate.toISOString().split('T')[0]);

      const computed = StreakEngine.calculate(
        habit.scheduleType,
        habit.startDate,
        dates,
        checkIn.timezoneAtCompletion,
        habit.scheduleDays.map((d) => d.dayOfWeek),
        habit.targetPerWeek || 1,
      );

      // Update stats
      const stats = await tx.habitStats.update({
        where: { habitId },
        data: {
          currentStreak: computed.currentStreak,
          bestStreak: computed.bestStreak,
          totalCompletions: computed.totalCompletions,
          completionRate: computed.completionRate,
          recalculatedAt: new Date(),
        },
      });

      // Deduct XP
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user) {
        await tx.user.update({
          where: { id: userId },
          data: {
            xp: Math.max(0, user.xp - 10),
            level: Math.max(1, Math.floor(Math.max(0, user.xp - 10) / 100) + 1),
          },
        });
      }

      // Delete matching room activities generated by this check-in
      await tx.activity.deleteMany({
        where: {
          actorUserId: userId,
          type: ActivityType.HABIT_COMPLETED,
          deduplicationKey: {
            startsWith: `${userId}:${habitId}:${checkIn.localDate.toISOString().split('T')[0]}:`,
          },
        },
      });

      return stats;
    });
  }
}
