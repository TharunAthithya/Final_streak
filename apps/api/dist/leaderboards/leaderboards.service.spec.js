"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const leaderboards_service_1 = require("./leaderboards.service");
const prisma_service_1 = require("../prisma/prisma.service");
const common_1 = require("@nestjs/common");
const mockPrisma = {
    roomMember: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
    },
    checkIn: {
        count: jest.fn(),
    },
};
describe('LeaderboardsService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                leaderboards_service_1.LeaderboardsService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        service = module.get(leaderboards_service_1.LeaderboardsService);
        jest.clearAllMocks();
    });
    it('should throw ForbiddenException if user is not a room member when fetching leaderboard', async () => {
        mockPrisma.roomMember.findFirst.mockResolvedValue(null);
        await expect(service.getRoomLeaderboard('user-123', 'room-123', 'weekly')).rejects.toThrow(common_1.ForbiddenException);
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
        mockPrisma.checkIn.count
            .mockResolvedValueOnce(3)
            .mockResolvedValueOnce(5)
            .mockResolvedValueOnce(5);
        const result = await service.getRoomLeaderboard('user-123', 'room-123', 'weekly');
        expect(result.length).toBe(3);
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
//# sourceMappingURL=leaderboards.service.spec.js.map