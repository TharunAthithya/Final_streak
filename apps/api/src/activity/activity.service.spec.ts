import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityType } from '@prisma/client';

const mockPrisma: any = {
  roomMember: {
    findFirst: jest.fn(),
  },
  activity: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  reaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    jest.clearAllMocks();
  });

  it('should throw ForbiddenException if user is not a member of the room when fetching feed', async () => {
    mockPrisma.roomMember.findFirst.mockResolvedValue(null); // not a member

    await expect(service.getRoomActivity('user-123', 'room-123')).rejects.toThrow(ForbiddenException);
  });

  it('should fetch room activity and group reactions correctly for a room member', async () => {
    mockPrisma.roomMember.findFirst.mockResolvedValue({ id: 'm-1' });
    mockPrisma.activity.findMany.mockResolvedValue([
      {
        id: 'act-1',
        actorUserId: 'actor-123',
        type: ActivityType.HABIT_COMPLETED,
        message: 'Completed Exercise',
        metadataJson: {},
        createdAt: new Date('2026-07-09T12:00:00Z'),
        actor: { displayName: 'Bob', avatarPath: null },
        reactions: [
          { userId: 'user-123', type: 'fire' },
          { userId: 'other-user', type: 'fire' },
        ],
      },
    ]);

    const result = await service.getRoomActivity('user-123', 'room-123');

    expect(result.length).toBe(1);
    expect(result[0].reactions).toEqual([
      { type: 'fire', count: 2, userReacted: true },
    ]);
  });

  it('should toggle reaction (create if not exists)', async () => {
    mockPrisma.activity.findUnique.mockResolvedValue({ id: 'act-1', roomId: null });
    mockPrisma.reaction.findUnique.mockResolvedValue(null);
    mockPrisma.reaction.create.mockResolvedValue({ id: 'r-1' });

    const result = await service.reactToActivity('user-123', 'act-1', 'clap');

    expect(mockPrisma.reaction.create).toHaveBeenCalledWith({
      data: {
        activityId: 'act-1',
        userId: 'user-123',
        type: 'clap',
      },
    });
    expect(result.reacted).toBe(true);
  });

  it('should toggle reaction (delete if already exists)', async () => {
    mockPrisma.activity.findUnique.mockResolvedValue({ id: 'act-1', roomId: null });
    mockPrisma.reaction.findUnique.mockResolvedValue({ id: 'r-existing', type: 'clap' });
    mockPrisma.reaction.delete.mockResolvedValue({});

    const result = await service.reactToActivity('user-123', 'act-1', 'clap');

    expect(mockPrisma.reaction.delete).toHaveBeenCalledWith({
      where: { id: 'r-existing' },
    });
    expect(result.reacted).toBe(false);
  });
});
