"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const notifications_service_1 = require("./notifications.service");
const prisma_service_1 = require("../prisma/prisma.service");
const mockPrisma = {
    device: {
        deleteMany: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
    },
    notificationDelivery: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
};
describe('NotificationsService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                notifications_service_1.NotificationsService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        service = module.get(notifications_service_1.NotificationsService);
        jest.clearAllMocks();
    });
    it('should clean up token from other users and upsert for current user', async () => {
        mockPrisma.device.deleteMany.mockResolvedValue({ count: 1 });
        mockPrisma.device.upsert.mockResolvedValue({ id: 'd-1' });
        const result = await service.registerDevice('user-123', 'android', 'ExponentPushToken[123]');
        expect(mockPrisma.device.deleteMany).toHaveBeenCalledWith({
            where: {
                pushToken: 'ExponentPushToken[123]',
                userId: { not: 'user-123' },
            },
        });
        expect(mockPrisma.device.upsert).toHaveBeenCalledWith({
            where: {
                userId_pushToken: {
                    userId: 'user-123',
                    pushToken: 'ExponentPushToken[123]',
                },
            },
            create: {
                userId: 'user-123',
                platform: 'android',
                pushToken: 'ExponentPushToken[123]',
                tokenStatus: 'ACTIVE',
            },
            update: {
                platform: 'android',
                tokenStatus: 'ACTIVE',
                lastSeenAt: expect.any(Date),
            },
        });
        expect(result.id).toBe('d-1');
    });
    it('should prevent duplicate notification delivery using deduplicationKey', async () => {
        mockPrisma.notificationDelivery.findUnique.mockResolvedValue({ id: 'del-1' });
        const result = await service.sendNotification('user-123', 'milestone', 'Congrats!', 'Streak of 5 reached', 'dedup-123');
        expect(result.status).toBe('duplicate');
        expect(result.deliveryId).toBe('del-1');
        expect(mockPrisma.notificationDelivery.create).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=notifications.service.spec.js.map