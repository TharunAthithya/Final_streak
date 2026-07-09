import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoomRole, RoomVisibility } from '@prisma/client';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma: any = {
  room: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  roomMember: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  roomHabit: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  roomHabitLink: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  habit: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  activity: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    jest.clearAllMocks();
  });

  it('should create room and add creator as OWNER member', async () => {
    mockPrisma.room.create.mockResolvedValue({ id: 'r-1', name: 'Fitness Room' });
    mockPrisma.roomMember.create.mockResolvedValue({ id: 'm-1' });

    const dto = { name: 'Fitness Room', description: 'Get fit', visibility: 'PRIVATE' as const };
    const result = await service.createRoom('user-123', dto);

    expect(mockPrisma.room.create).toHaveBeenCalled();
    expect(mockPrisma.roomMember.create).toHaveBeenCalledWith({
      data: {
        roomId: 'r-1',
        userId: 'user-123',
        role: RoomRole.OWNER,
      },
    });
    expect(result.name).toBe('Fitness Room');
  });

  it('should throw ConflictException if trying to join an actively joined room', async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: 'r-1', inviteCode: 'FIT123' });
    mockPrisma.roomMember.findFirst.mockResolvedValue({ id: 'm-1', leftAt: null });

    const dto = { inviteCode: 'FIT123' };
    await expect(service.joinRoom('user-123', dto)).rejects.toThrow(ConflictException);
  });

  it('should soft unlink linkages when leaving room', async () => {
    mockPrisma.roomMember.findFirst.mockResolvedValue({ id: 'm-1', role: RoomRole.MEMBER });
    mockPrisma.roomMember.update.mockResolvedValue({ id: 'm-1', leftAt: new Date() });
    mockPrisma.roomHabitLink.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.leaveRoom('user-123', 'r-1');
    expect(mockPrisma.roomMember.update).toHaveBeenCalledWith({
      where: { id: 'm-1' },
      data: { leftAt: expect.any(Date) },
    });
    expect(mockPrisma.roomHabitLink.updateMany).toHaveBeenCalledWith({
      where: {
        roomMemberId: 'm-1',
        unlinkedAt: null,
      },
      data: {
        unlinkedAt: expect.any(Date),
      },
    });
    expect(result.success).toBe(true);
  });

  it('should link habit if no active linkage exists', async () => {
    mockPrisma.roomMember.findFirst.mockResolvedValue({ id: 'm-1' });
    mockPrisma.habit.findUnique.mockResolvedValue({ id: 'h-1', userId: 'user-123' });
    mockPrisma.roomHabit.findUnique.mockResolvedValue({ id: 'rh-1', archivedAt: null });
    mockPrisma.roomHabitLink.findFirst.mockResolvedValue(null); // active checks pass
    mockPrisma.roomHabitLink.create.mockResolvedValue({ id: 'link-1' });

    const result = await service.linkPersonalHabit('user-123', 'r-1', 'rh-1', 'h-1');

    expect(mockPrisma.roomHabitLink.create).toHaveBeenCalledWith({
      data: {
        roomMemberId: 'm-1',
        roomHabitId: 'rh-1',
        personalHabitId: 'h-1',
      },
    });
    expect(result.id).toBe('link-1');
  });

  it('should throw ConflictException if personal habit is already linked in room', async () => {
    mockPrisma.roomMember.findFirst.mockResolvedValue({ id: 'm-1' });
    mockPrisma.habit.findUnique.mockResolvedValue({ id: 'h-1', userId: 'user-123' });
    mockPrisma.roomHabit.findUnique.mockResolvedValue({ id: 'rh-1', archivedAt: null });
    // Simulate already linked active checks failing
    mockPrisma.roomHabitLink.findFirst.mockResolvedValue({ id: 'link-existing' });

    await expect(service.linkPersonalHabit('user-123', 'r-1', 'rh-1', 'h-1')).rejects.toThrow(ConflictException);
  });

  it('should soft unlink voluntarily', async () => {
    mockPrisma.roomMember.findFirst.mockResolvedValue({ id: 'm-1' });
    mockPrisma.roomHabitLink.findFirst.mockResolvedValue({ id: 'link-1', roomMemberId: 'm-1' });
    mockPrisma.roomHabitLink.update.mockResolvedValue({ id: 'link-1', unlinkedAt: new Date() });

    const result = await service.unlinkPersonalHabit('user-123', 'r-1', 'rh-1');

    expect(mockPrisma.roomHabitLink.update).toHaveBeenCalledWith({
      where: { id: 'link-1' },
      data: { unlinkedAt: expect.any(Date) },
    });
    expect(result.unlinkedAt).toBeDefined();
  });
});
