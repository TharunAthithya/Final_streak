import { HabitStatus, ScheduleType, RoomVisibility } from '@streak/contracts';
export const mockUser = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    displayName: 'Test User',
    username: 'testuser',
    timezone: 'UTC',
    xp: 100,
    level: 1,
    createdAt: new Date().toISOString(),
};
export const mockHabit = {
    id: 'habit-uuid-456',
    userId: 'user-uuid-123',
    name: 'Read Book',
    description: 'Read a book for 15 minutes daily',
    icon: 'book',
    status: HabitStatus.ACTIVE,
    scheduleType: ScheduleType.DAILY,
    timezone: 'UTC',
    startDate: '2026-07-09',
    createdAt: new Date().toISOString(),
};
export const mockRoom = {
    id: 'room-uuid-789',
    ownerId: 'user-uuid-123',
    name: 'Daily Readers',
    description: 'A room for daily reading habits',
    visibility: RoomVisibility.PRIVATE,
    inviteCode: 'READ123',
    memberCount: 1,
    activeTodayCount: 0,
};
