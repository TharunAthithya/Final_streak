"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const habits_service_1 = require("./habits.service");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const mockPrisma = {
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
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                habits_service_1.HabitsService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        service = module.get(habits_service_1.HabitsService);
        jest.clearAllMocks();
    });
    it('should create a daily habit and initialize stats in a transaction', async () => {
        const mockHabit = {
            id: 'habit-123',
            name: 'Exercise',
            scheduleType: client_1.ScheduleType.DAILY,
        };
        mockPrisma.habit.create.mockResolvedValue(mockHabit);
        const dto = {
            name: 'Exercise',
            scheduleType: 'DAILY',
            timezone: 'UTC',
            startDate: '2026-07-09',
        };
        const result = await service.createHabit('user-123', dto);
        expect(mockPrisma.habit.create).toHaveBeenCalledWith({
            data: {
                userId: 'user-123',
                name: 'Exercise',
                scheduleType: client_1.ScheduleType.DAILY,
                timezone: 'UTC',
                startDate: new Date('2026-07-09'),
                status: client_1.HabitStatus.ACTIVE,
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
            scheduleType: client_1.ScheduleType.SPECIFIC_DAYS,
        };
        mockPrisma.habit.create.mockResolvedValue(mockHabit);
        const dto = {
            name: 'Code',
            scheduleType: 'SPECIFIC_DAYS',
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
        mockPrisma.habit.findMany.mockResolvedValue([{ id: 'h1', status: client_1.HabitStatus.ACTIVE }]);
        const result = await service.getHabits('user-123', false);
        expect(mockPrisma.habit.findMany).toHaveBeenCalledWith({
            where: {
                userId: 'user-123',
                status: { not: client_1.HabitStatus.ARCHIVED },
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
        await expect(service.getHabitById('user-123', 'h1')).rejects.toThrow(common_1.ForbiddenException);
    });
    it('should throw NotFoundException if habit does not exist', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(null);
        await expect(service.getHabitById('user-123', 'h1')).rejects.toThrow(common_1.NotFoundException);
    });
    it('should archive a habit', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue({ id: 'h1', userId: 'user-123' });
        mockPrisma.habit.update.mockResolvedValue({ id: 'h1', status: client_1.HabitStatus.ARCHIVED });
        const result = await service.archiveHabit('user-123', 'h1');
        expect(mockPrisma.habit.update).toHaveBeenCalledWith({
            where: { id: 'h1' },
            data: {
                status: client_1.HabitStatus.ARCHIVED,
                archivedAt: expect.any(Date),
            },
        });
        expect(result.status).toBe(client_1.HabitStatus.ARCHIVED);
    });
});
//# sourceMappingURL=habits.service.spec.js.map