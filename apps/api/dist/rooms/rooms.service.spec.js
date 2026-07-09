"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const rooms_service_1 = require("./rooms.service");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const mockPrisma = {
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
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                rooms_service_1.RoomsService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        service = module.get(rooms_service_1.RoomsService);
        jest.clearAllMocks();
    });
    it('should create room and add creator as OWNER member', async () => {
        mockPrisma.room.create.mockResolvedValue({ id: 'r-1', name: 'Fitness Room' });
        mockPrisma.roomMember.create.mockResolvedValue({ id: 'm-1' });
        const dto = { name: 'Fitness Room', description: 'Get fit', visibility: 'PRIVATE' };
        const result = await service.createRoom('user-123', dto);
        expect(mockPrisma.room.create).toHaveBeenCalled();
        expect(mockPrisma.roomMember.create).toHaveBeenCalledWith({
            data: {
                roomId: 'r-1',
                userId: 'user-123',
                role: client_1.RoomRole.OWNER,
            },
        });
        expect(result.name).toBe('Fitness Room');
    });
    it('should throw ConflictException if trying to join an actively joined room', async () => {
        mockPrisma.room.findUnique.mockResolvedValue({ id: 'r-1', inviteCode: 'FIT123' });
        mockPrisma.roomMember.findFirst.mockResolvedValue({ id: 'm-1', leftAt: null });
        const dto = { inviteCode: 'FIT123' };
        await expect(service.joinRoom('user-123', dto)).rejects.toThrow(common_1.ConflictException);
    });
    it('should soft unlink linkages when leaving room', async () => {
        mockPrisma.roomMember.findFirst.mockResolvedValue({ id: 'm-1', role: client_1.RoomRole.MEMBER });
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
        mockPrisma.roomHabitLink.findFirst.mockResolvedValue(null);
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
        mockPrisma.roomHabitLink.findFirst.mockResolvedValue({ id: 'link-existing' });
        await expect(service.linkPersonalHabit('user-123', 'r-1', 'rh-1', 'h-1')).rejects.toThrow(common_1.ConflictException);
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
//# sourceMappingURL=rooms.service.spec.js.map