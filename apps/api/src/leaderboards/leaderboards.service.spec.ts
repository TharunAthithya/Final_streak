import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardsService } from './leaderboards.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

const mockPrisma: any = {
  roomMember: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  checkIn: {
    count: jest.fn(),
  },
};

describe('LeaderboardsService', () => {
  let service: LeaderboardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LeaderboardsService>(LeaderboardsService);
    jest.clearAllMocks();
  });

  it('should throw ForbiddenException if user is not a room member when fetching leaderboard', async () => {
    mockPrisma.roomMember.findFirst.mockResolvedValue(null);

    await expect(service.getRoomLeaderboard('user-123', 'room-123', 'weekly')).rejects.toThrow(ForbiddenException);
  });

  it('should calculate scores and return ranked members with alphabetical tie-breaks', async () => {
    mockPrisma.roomMember.findFirst.mockResolvedValue({ id: 'm-1' });
    mockPrisma.roomMember.findMany.mockResolvedValue([
      {
        userId: 'u-1',
        user: { displayName: 'Charlie', avatarPath: null },
        roomHabitLinks: [{ personalHabitId: 'h-1' }],
      },
      {
        userId: 'u-2',
        user: { displayName: 'Bob', avatarPath: null },
        roomHabitLinks: [{ personalHabitId: 'h-2' }],
      },
      {
        userId: 'u-3',
        user: { displayName: 'Alice', avatarPath: null },
        roomHabitLinks: [{ personalHabitId: 'h-3' }],
      },
    ]);

    // Mock count return values
    // u-1: 3 completions
    // u-2: 5 completions
    // u-3: 5 completions
    mockPrisma.checkIn.count
      .mockResolvedValueOnce(3) // u-1
      .mockResolvedValueOnce(5) // u-2
      .mockResolvedValueOnce(5); // u-3

    const result = await service.getRoomLeaderboard('user-123', 'room-123', 'weekly');

    expect(result.length).toBe(3);

    // Rank 1: Bob (5 completions, display name B comes before display name A for u-3? No, Bob vs Alice, Alice comes first)
    // Wait, let's trace: score 5 for u-2 (Bob) and u-3 (Alice).
    // Alphabetical sort: "Alice" (u-3) comes before "Bob" (u-2).
    // So Rank 1 should be Alice (u-3), Rank 2 should be Bob (u-2), Rank 3 should be Charlie (u-1, score 3).
    expect(result[0].userId).toBe('u-3');
    expect(result[0].rank).toBe(1);
    expect(result[0].score).toBe(5);

    expect(result[1].userId).toBe('u-2');
    expect(result[1].rank).toBe(2);
    expect(result[1].score).toBe(5);

    expect(result[2].userId).toBe('u-1');
    expect(result[2].rank).toBe(3);
    expect(result[2].score).toBe(3);
  });
});
