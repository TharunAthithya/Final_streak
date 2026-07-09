import { Test, TestingModule } from '@nestjs/testing';
import { CheckInsService } from './check-ins.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleType, HabitStatus } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockPrisma: any = {
  habit: {
    findUnique: jest.fn(),
  },
  checkIn: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  habitStats: {
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  roomHabitLink: {
    findMany: jest.fn(),
  },
  activity: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

describe('CheckInsService', () => {
  let service: CheckInsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckInsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CheckInsService>(CheckInsService);
    jest.clearAllMocks();
  });

  it('should successfully check in, update stats, award XP, and skip activity if no linked rooms', async () => {
    const mockHabit = {
      id: 'habit-123',
      userId: 'user-123',
      scheduleType: ScheduleType.DAILY,
      startDate: new Date('2026-07-01'),
      scheduleDays: [],
    };
    mockPrisma.habit.findUnique.mockResolvedValue(mockHabit);
    mockPrisma.checkIn.findUnique.mockResolvedValue(null); // idempotency check
    mockPrisma.checkIn.findFirst.mockResolvedValue(null); // duplicate localDate check
    mockPrisma.checkIn.create.mockResolvedValue({ id: 'c-1', localDate: new Date('2026-07-09') });
    mockPrisma.checkIn.findMany.mockResolvedValue([{ localDate: new Date('2026-07-09') }]);
    mockPrisma.habitStats.update.mockResolvedValue({ habitId: 'habit-123', currentStreak: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', xp: 50, level: 1, displayName: 'Alice' });
    mockPrisma.roomHabitLink.findMany.mockResolvedValue([]); // no linked rooms

    const dto = {
      localDate: '2026-07-09',
      timezoneAtCompletion: 'UTC',
      idempotencyKey: 'key-123',
    };

    const result = await service.checkIn('user-123', 'habit-123', dto);

    expect(mockPrisma.checkIn.create).toHaveBeenCalled();
    expect(mockPrisma.habitStats.update).toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { xp: 60, level: 1 },
    });
    expect(result.xpAwarded).toBe(10);
    expect(result.levelUp).toBe(false);
  });

  it('should throw ConflictException on duplicate idempotency key', async () => {
    mockPrisma.habit.findUnique.mockResolvedValue({ id: 'h1', userId: 'u1' });
    mockPrisma.checkIn.findUnique.mockResolvedValue({ id: 'existing' });

    const dto = { localDate: '2026-07-09', timezoneAtCompletion: 'UTC', idempotencyKey: 'dup-key' };

    await expect(service.checkIn('u1', 'h1', dto)).rejects.toThrow(ConflictException);
  });

  it('should throw ConflictException on duplicate local completion date', async () => {
    mockPrisma.habit.findUnique.mockResolvedValue({ id: 'h1', userId: 'u1' });
    mockPrisma.checkIn.findUnique.mockResolvedValue(null);
    mockPrisma.checkIn.findFirst.mockResolvedValue({ id: 'existing-date' });

    const dto = { localDate: '2026-07-09', timezoneAtCompletion: 'UTC', idempotencyKey: 'new-key' };

    await expect(service.checkIn('u1', 'h1', dto)).rejects.toThrow(ConflictException);
  });
});
