import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma: any = {
  user: {
    update: jest.fn(),
    delete: jest.fn(),
  },
  room: {
    findMany: jest.fn(),
  },
  checkIn: { deleteMany: jest.fn() },
  habitStats: { deleteMany: jest.fn() },
  habitScheduleDay: { deleteMany: jest.fn() },
  habit: { deleteMany: jest.fn() },
  roomMember: { deleteMany: jest.fn() },
  activity: { deleteMany: jest.fn() },
  reaction: { deleteMany: jest.fn() },
  device: { deleteMany: jest.fn() },
  notificationDelivery: { deleteMany: jest.fn() },
  userAchievement: { deleteMany: jest.fn() },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should successfully update user profile details', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'user-123', displayName: 'New Name' });

    const dto = { displayName: 'New Name', timezone: 'UTC' };
    const result = await service.updateProfile('user-123', dto);

    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(result.displayName).toBe('New Name');
  });

  it('should throw error if user attempts to delete account while owning active rooms', async () => {
    mockPrisma.room.findMany.mockResolvedValue([{ id: 'room-1' }]);

    await expect(service.deleteAccount('user-123')).rejects.toThrow(
      'You must transfer ownership or archive your rooms before deleting your account'
    );
  });

  it('should delete user and all user dependencies if no active rooms are owned', async () => {
    mockPrisma.room.findMany.mockResolvedValue([]);
    mockPrisma.user.delete.mockResolvedValue({ id: 'user-123' });

    const result = await service.deleteAccount('user-123');

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-123' } });
    expect(result.success).toBe(true);
  });
});
