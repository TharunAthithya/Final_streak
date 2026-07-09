"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const check_ins_service_1 = require("./check-ins.service");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const mockPrisma = {
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
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                check_ins_service_1.CheckInsService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        service = module.get(check_ins_service_1.CheckInsService);
        jest.clearAllMocks();
    });
    it('should successfully check in, update stats, award XP, and skip activity if no linked rooms', async () => {
        const mockHabit = {
            id: 'habit-123',
            userId: 'user-123',
            scheduleType: client_1.ScheduleType.DAILY,
            startDate: new Date('2026-07-01'),
            scheduleDays: [],
        };
        mockPrisma.habit.findUnique.mockResolvedValue(mockHabit);
        mockPrisma.checkIn.findUnique.mockResolvedValue(null);
        mockPrisma.checkIn.findFirst.mockResolvedValue(null);
        mockPrisma.checkIn.create.mockResolvedValue({ id: 'c-1', localDate: new Date('2026-07-09') });
        mockPrisma.checkIn.findMany.mockResolvedValue([{ localDate: new Date('2026-07-09') }]);
        mockPrisma.habitStats.update.mockResolvedValue({ habitId: 'habit-123', currentStreak: 1 });
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', xp: 50, level: 1, displayName: 'Alice' });
        mockPrisma.roomHabitLink.findMany.mockResolvedValue([]);
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
        await expect(service.checkIn('u1', 'h1', dto)).rejects.toThrow(common_1.ConflictException);
    });
    it('should throw ConflictException on duplicate local completion date', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue({ id: 'h1', userId: 'u1' });
        mockPrisma.checkIn.findUnique.mockResolvedValue(null);
        mockPrisma.checkIn.findFirst.mockResolvedValue({ id: 'existing-date' });
        const dto = { localDate: '2026-07-09', timezoneAtCompletion: 'UTC', idempotencyKey: 'new-key' };
        await expect(service.checkIn('u1', 'h1', dto)).rejects.toThrow(common_1.ConflictException);
    });
});
//# sourceMappingURL=check-ins.service.spec.js.map