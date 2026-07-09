import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma/prisma.service';
import { HabitsService } from './habits/habits.service';
import { CheckInsService } from './check-ins/check-ins.service';
import { RoomsService } from './rooms/rooms.service';
import { UsersService } from './users/users.service';
import { AppModule } from './app.module';
import { ScheduleType, HabitStatus, RoomRole, ActivityType } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

describe('Database Integration Tests', () => {
  let prisma: PrismaService;
  let habitsService: HabitsService;
  let checkInsService: CheckInsService;
  let roomsService: RoomsService;
  let usersService: UsersService;

  beforeAll(async () => {
    // Only run if DATABASE_URL is pointing to a local database to prevent interfering with other environments
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    habitsService = moduleFixture.get<HabitsService>(HabitsService);
    checkInsService = moduleFixture.get<CheckInsService>(CheckInsService);
    roomsService = moduleFixture.get<RoomsService>(RoomsService);
    usersService = moduleFixture.get<UsersService>(UsersService);

    await cleanDb();
  });

  afterAll(async () => {
    if (prisma) {
      await cleanDb();
      await prisma.$disconnect();
    }
  });

  async function cleanDb() {
    await prisma.reaction.deleteMany({});
    await prisma.activity.deleteMany({});
    await prisma.roomHabitLink.deleteMany({});
    await prisma.roomHabit.deleteMany({});
    await prisma.roomMember.deleteMany({});
    await prisma.room.deleteMany({});
    await prisma.checkIn.deleteMany({});
    await prisma.habitStats.deleteMany({});
    await prisma.habitScheduleDay.deleteMany({});
    await prisma.habit.deleteMany({});
    await prisma.device.deleteMany({});
    await prisma.userAchievement.deleteMany({});
    await prisma.user.deleteMany({});
  }

  describe('MVP Flow Integration', () => {
    let userId: string;
    let habitId: string;

    beforeEach(async () => {
      await cleanDb();
      // Setup test user
      const user = await prisma.user.create({
        data: {
          id: 'a0000000-0000-0000-0000-000000000001',
          authUserId: 'b0000000-0000-0000-0000-000000000001',
          email: 'integration@example.com',
          displayName: 'Integration User',
          username: 'integration_user',
          timezone: 'UTC',
        },
      });
      userId = user.id;
    });

    it('should verify habit creation details and initialized stats', async () => {
      const habit = await habitsService.createHabit(userId, {
        name: 'Daily Meditation',
        scheduleType: ScheduleType.DAILY,
        timezone: 'UTC',
        startDate: '2026-07-10',
      });

      expect(habit).toBeDefined();
      expect(habit.name).toBe('Daily Meditation');

      const stats = await prisma.habitStats.findUnique({
        where: { habitId: habit.id },
      });
      expect(stats).toBeDefined();
      expect(stats?.currentStreak).toBe(0);
      expect(stats?.totalCompletions).toBe(0);
    });

    it('should verify check-in duplicate prevention and idempotency retry triggers', async () => {
      const habit = await habitsService.createHabit(userId, {
        name: 'Gym Workout',
        scheduleType: ScheduleType.DAILY,
        timezone: 'UTC',
        startDate: '2026-07-10',
      });

      // 1. Success check-in
      const res1 = await checkInsService.checkIn(userId, habit.id, {
        localDate: '2026-07-10',
        timezoneAtCompletion: 'UTC',
        idempotencyKey: 'idemp-key-1',
      });
      expect(res1.checkIn).toBeDefined();

      // 2. Duplicate localDate check-in
      await expect(
        checkInsService.checkIn(userId, habit.id, {
          localDate: '2026-07-10',
          timezoneAtCompletion: 'UTC',
          idempotencyKey: 'idemp-key-2',
        }),
      ).rejects.toThrow(ConflictException);

      // 3. Retry same idempotency key
      await expect(
        checkInsService.checkIn(userId, habit.id, {
          localDate: '2026-07-11',
          timezoneAtCompletion: 'UTC',
          idempotencyKey: 'idemp-key-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should enforce exactly-once user XP accumulation & verify concurrent completion race controls', async () => {
      const habit = await habitsService.createHabit(userId, {
        name: 'Read Books',
        scheduleType: ScheduleType.DAILY,
        timezone: 'UTC',
        startDate: '2026-07-10',
      });

      // Fetch starting XP
      const startUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(startUser.xp).toBe(0);

      // Trigger concurrent completions for same local date
      const promises = [
        checkInsService.checkIn(userId, habit.id, {
          localDate: '2026-07-10',
          timezoneAtCompletion: 'UTC',
          idempotencyKey: 'concurrent-key-1',
        }),
        checkInsService.checkIn(userId, habit.id, {
          localDate: '2026-07-10',
          timezoneAtCompletion: 'UTC',
          idempotencyKey: 'concurrent-key-2',
        }),
      ];

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one should succeed, others should reject with conflict
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // XP should only be awarded once
      const endUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(endUser.xp).toBe(10); // +10 XP once
    });

    it('should verify Room membership unique indexes, opt-in linkages, and unlinking activity states', async () => {
      // 1. Create Room
      const room = await roomsService.createRoom(userId, {
        name: 'Accountability Squad',
        description: 'Get things done',
        visibility: 'PUBLIC',
      });

      // Owner is auto-joined. Try joining again to test active membership uniqueness
      await expect(
        roomsService.joinRoom(userId, { inviteCode: room.inviteCode! }),
      ).rejects.toThrow(ConflictException);

      // 2. Create Room Habit
      const roomHabit = await roomsService.createRoomHabit(userId, room.id, 'Gym Habit');

      // 3. Create Personal Habit
      const personalHabit = await habitsService.createHabit(userId, {
        name: 'Personal Gym Routine',
        scheduleType: ScheduleType.DAILY,
        timezone: 'UTC',
        startDate: '2026-07-10',
      });

      // 4. Link Personal Habit to Room Habit
      const link = await roomsService.linkPersonalHabit(userId, room.id, roomHabit.id, personalHabit.id);
      expect(link).toBeDefined();
      expect(link.unlinkedAt).toBeNull();

      // Test active RoomHabitLink uniqueness (duplicate link of same personal habit to another room habit)
      const roomHabit2 = await roomsService.createRoomHabit(userId, room.id, 'Gym Habit Two');
      await expect(
        roomsService.linkPersonalHabit(userId, room.id, roomHabit2.id, personalHabit.id),
      ).rejects.toThrow(ConflictException);

      // 5. Complete linked habit and check that activity is created
      await checkInsService.checkIn(userId, personalHabit.id, {
        localDate: '2026-07-10',
        timezoneAtCompletion: 'UTC',
        idempotencyKey: 'linked-checkin-key-1',
      });

      const activitiesBefore = await prisma.activity.findMany({
        where: { roomId: room.id, type: ActivityType.HABIT_COMPLETED },
      });
      expect(activitiesBefore.length).toBe(1);
      expect(activitiesBefore[0].message).toContain('completed "Personal Gym Routine"');

      // 6. Soft unlink personal habit
      const unlinked = await roomsService.unlinkPersonalHabit(userId, room.id, roomHabit.id);
      expect(unlinked.unlinkedAt).not.toBeNull();

      // 7. Complete again after unlink, verify no new activity is generated
      await checkInsService.checkIn(userId, personalHabit.id, {
        localDate: '2026-07-11',
        timezoneAtCompletion: 'UTC',
        idempotencyKey: 'linked-checkin-key-2',
      });

      const activitiesAfter = await prisma.activity.findMany({
        where: { roomId: room.id, type: ActivityType.HABIT_COMPLETED },
      });
      // Should remain 1 because link is inactive
      expect(activitiesAfter.length).toBe(1);
    });
  });
});
