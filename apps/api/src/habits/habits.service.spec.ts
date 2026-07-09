import { Test, TestingModule } from '@nestjs/testing';
import { HabitsService } from './habits.service';
import { PrismaService } from '../prisma/prisma.service';
import { HabitStatus, ScheduleType } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrisma: any = {
  habit: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  habitScheduleDay: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  habitStats: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

describe('HabitsService', () => {
  let service: HabitsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HabitsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<HabitsService>(HabitsService);
    jest.clearAllMocks();
  });

  it('should create a daily habit and initialize stats in a transaction', async () => {
    const mockHabit = {
      id: 'habit-123',
      name: 'Exercise',
      scheduleType: ScheduleType.DAILY,
    };
    mockPrisma.habit.create.mockResolvedValue(mockHabit);

    const dto = {
      name: 'Exercise',
      scheduleType: 'DAILY' as const,
      timezone: 'UTC',
      startDate: '2026-07-09',
    };

    const result = await service.createHabit('user-123', dto);

    expect(mockPrisma.habit.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        name: 'Exercise',
        scheduleType: ScheduleType.DAILY,
        timezone: 'UTC',
        startDate: new Date('2026-07-09'),
        status: HabitStatus.ACTIVE,
      },
    });

    expect(mockPrisma.habitStats.create).toHaveBeenCalledWith({
      data: {
        habitId: 'habit-123',
        currentStreak: 0,
        bestStreak: 0,
        totalCompletions: 0,
        completionRate: 0.00,
      },
    });

    expect(result).toEqual(mockHabit);
  });

  it('should create scheduled days for SPECIFIC_DAYS habit', async () => {
    const mockHabit = {
      id: 'habit-456',
      name: 'Code',
      scheduleType: ScheduleType.SPECIFIC_DAYS,
    };
    mockPrisma.habit.create.mockResolvedValue(mockHabit);

    const dto = {
      name: 'Code',
      scheduleType: 'SPECIFIC_DAYS' as const,
      daysOfWeek: [1, 3, 5],
      timezone: 'UTC',
      startDate: '2026-07-09',
    };

    await service.createHabit('user-123', dto);

    expect(mockPrisma.habitScheduleDay.createMany).toHaveBeenCalledWith({
      data: [
        { habitId: 'habit-456', dayOfWeek: 1 },
        { habitId: 'habit-456', dayOfWeek: 3 },
        { habitId: 'habit-456', dayOfWeek: 5 },
      ],
    });
  });

  it('should find non-archived habits for a user', async () => {
    mockPrisma.habit.findMany.mockResolvedValue([{ id: 'h1', status: HabitStatus.ACTIVE }]);
    const result = await service.getHabits('user-123', false);

    expect(mockPrisma.habit.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        status: { not: HabitStatus.ARCHIVED },
      },
      include: {
        stats: true,
        scheduleDays: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result.length).toBe(1);
  });

  it('should throw ForbiddenException if user gets a habit they do not own', async () => {
    mockPrisma.habit.findUnique.mockResolvedValue({ id: 'h1', userId: 'user-other' });

    await expect(service.getHabitById('user-123', 'h1')).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if habit does not exist', async () => {
    mockPrisma.habit.findUnique.mockResolvedValue(null);

    await expect(service.getHabitById('user-123', 'h1')).rejects.toThrow(NotFoundException);
  });

  it('should archive a habit', async () => {
    mockPrisma.habit.findUnique.mockResolvedValue({ id: 'h1', userId: 'user-123' });
    mockPrisma.habit.update.mockResolvedValue({ id: 'h1', status: HabitStatus.ARCHIVED });

    const result = await service.archiveHabit('user-123', 'h1');
    expect(mockPrisma.habit.update).toHaveBeenCalledWith({
      where: { id: 'h1' },
      data: {
        status: HabitStatus.ARCHIVED,
        archivedAt: expect.any(Date),
      },
    });
    expect(result.status).toBe(HabitStatus.ARCHIVED);
  });
});
