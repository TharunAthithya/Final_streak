import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHabitDto } from '@streak/validation';
import { Habit, HabitStatus, ScheduleType } from '@prisma/client';

@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}

  async createHabit(userId: string, dto: CreateHabitDto): Promise<Habit> {
    return this.prisma.$transaction(async (tx) => {
      const habit = await tx.habit.create({
        data: {
          userId,
          name: dto.name,
          description: dto.description,
          icon: dto.icon,
          scheduleType: dto.scheduleType as ScheduleType,
          targetPerWeek: dto.targetPerWeek,
          timezone: dto.timezone,
          startDate: new Date(dto.startDate),
          status: HabitStatus.ACTIVE,
        },
      });

      // Create scheduled days if specific days of the week are defined
      if (dto.scheduleType === 'SPECIFIC_DAYS' && dto.daysOfWeek) {
        await tx.habitScheduleDay.createMany({
          data: dto.daysOfWeek.map((day) => ({
            habitId: habit.id,
            dayOfWeek: day,
          })),
        });
      }

      // Initialize empty default stats to prevent performance delays later
      await tx.habitStats.create({
        data: {
          habitId: habit.id,
          currentStreak: 0,
          bestStreak: 0,
          totalCompletions: 0,
          completionRate: 0.00,
        },
      });

      return habit;
    });
  }

  async getHabits(userId: string, includeArchived = false): Promise<any[]> {
    return this.prisma.habit.findMany({
      where: {
        userId,
        status: includeArchived ? undefined : { not: HabitStatus.ARCHIVED },
      },
      include: {
        stats: true,
        scheduleDays: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHabitById(userId: string, habitId: string): Promise<any> {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        stats: true,
        scheduleDays: true,
        checkIns: {
          orderBy: { localDate: 'desc' },
          take: 30, // Get recent completions context
        },
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    if (habit.userId !== userId) {
      throw new ForbiddenException('You do not own this habit');
    }

    return habit;
  }

  async updateHabit(userId: string, habitId: string, dto: CreateHabitDto): Promise<Habit> {
    const habit = await this.prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) throw new NotFoundException('Habit not found');
    if (habit.userId !== userId) throw new ForbiddenException('You do not own this habit');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.habit.update({
        where: { id: habitId },
        data: {
          name: dto.name,
          description: dto.description,
          icon: dto.icon,
          scheduleType: dto.scheduleType as ScheduleType,
          targetPerWeek: dto.targetPerWeek,
          timezone: dto.timezone,
          startDate: new Date(dto.startDate),
        },
      });

      // Clear existing scheduled days
      await tx.habitScheduleDay.deleteMany({ where: { habitId } });

      // Create new scheduled days if specific days are defined
      if (dto.scheduleType === 'SPECIFIC_DAYS' && dto.daysOfWeek) {
        await tx.habitScheduleDay.createMany({
          data: dto.daysOfWeek.map((day) => ({
            habitId,
            dayOfWeek: day,
          })),
        });
      }

      return updated;
    });
  }

  async archiveHabit(userId: string, habitId: string): Promise<Habit> {
    const habit = await this.prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) throw new NotFoundException('Habit not found');
    if (habit.userId !== userId) throw new ForbiddenException('You do not own this habit');

    return this.prisma.habit.update({
      where: { id: habitId },
      data: {
        status: HabitStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });
  }

  async deleteHabit(userId: string, habitId: string): Promise<{ success: boolean }> {
    const habit = await this.prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) throw new NotFoundException('Habit not found');
    if (habit.userId !== userId) throw new ForbiddenException('You do not own this habit');

    await this.prisma.habit.delete({ where: { id: habitId } });
    return { success: true };
  }
}
