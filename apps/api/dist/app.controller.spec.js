"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_controller_1 = require("./app.controller");
const prisma_service_1 = require("./prisma/prisma.service");
const mockPrisma = {
    $queryRaw: jest.fn(),
};
describe('AppController', () => {
    let appController;
    beforeEach(async () => {
        const app = await testing_1.Test.createTestingModule({
            controllers: [app_controller_1.AppController],
            providers: [
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        appController = app.get(app_controller_1.AppController);
        jest.clearAllMocks();
    });
    it('should return healthy status when database is queryable', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([1]);
        const result = await appController.getHealth();
        expect(result.status).toBe('healthy');
        expect(result.database).toBe('connected');
        expect(result.timestamp).toBeDefined();
    });
    it('should return unhealthy status when database query throws error', async () => {
        mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failure'));
        const result = await appController.getHealth();
        expect(result.status).toBe('unhealthy');
        expect(result.database).toBe('disconnected');
        expect(result.error).toBe('Connection failure');
    });
});
//# sourceMappingURL=app.controller.spec.js.map