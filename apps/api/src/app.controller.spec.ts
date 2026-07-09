import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

const mockPrisma = {
  $queryRaw: jest.fn(),
};

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
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
