"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const prisma_service_1 = require("./prisma/prisma.service");
const habits_service_1 = require("./habits/habits.service");
const check_ins_service_1 = require("./check-ins/check-ins.service");
const rooms_service_1 = require("./rooms/rooms.service");
const users_service_1 = require("./users/users.service");
const app_module_1 = require("./app.module");
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
describe('Database Integration Tests', () => {
    let prisma;
    let habitsService;
    let checkInsService;
    let roomsService;
    let usersService;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        prisma = moduleFixture.get(prisma_service_1.PrismaService);
        habitsService = moduleFixture.get(habits_service_1.HabitsService);
        checkInsService = moduleFixture.get(check_ins_service_1.CheckInsService);
        roomsService = moduleFixture.get(rooms_service_1.RoomsService);
        usersService = moduleFixture.get(users_service_1.UsersService);
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
        let userId;
        let habitId;
        beforeEach(async () => {
            await cleanDb();
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
                scheduleType: client_1.ScheduleType.DAILY,
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
                scheduleType: client_1.ScheduleType.DAILY,
                timezone: 'UTC',
                startDate: '2026-07-10',
            });
            const res1 = await checkInsService.checkIn(userId, habit.id, {
                localDate: '2026-07-10',
                timezoneAtCompletion: 'UTC',
                idempotencyKey: 'idemp-key-1',
            });
            expect(res1.checkIn).toBeDefined();
            await expect(checkInsService.checkIn(userId, habit.id, {
                localDate: '2026-07-10',
                timezoneAtCompletion: 'UTC',
                idempotencyKey: 'idemp-key-2',
            })).rejects.toThrow(common_1.ConflictException);
            await expect(checkInsService.checkIn(userId, habit.id, {
                localDate: '2026-07-11',
                timezoneAtCompletion: 'UTC',
                idempotencyKey: 'idemp-key-1',
            })).rejects.toThrow(common_1.ConflictException);
        });
        it('should enforce exactly-once user XP accumulation & verify concurrent completion race controls', async () => {
            const habit = await habitsService.createHabit(userId, {
                name: 'Read Books',
                scheduleType: client_1.ScheduleType.DAILY,
                timezone: 'UTC',
                startDate: '2026-07-10',
            });
            const startUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
            expect(startUser.xp).toBe(0);
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
            expect(fulfilled.length).toBe(1);
            expect(rejected.length).toBe(1);
            const endUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
            expect(endUser.xp).toBe(10);
        });
        it('should verify Room membership unique indexes, opt-in linkages, and unlinking activity states', async () => {
            const room = await roomsService.createRoom(userId, {
                name: 'Accountability Squad',
                description: 'Get things done',
                visibility: 'PUBLIC',
            });
            await expect(roomsService.joinRoom(userId, { inviteCode: room.inviteCode })).rejects.toThrow(common_1.ConflictException);
            const roomHabit = await roomsService.createRoomHabit(userId, room.id, 'Gym Habit');
            const personalHabit = await habitsService.createHabit(userId, {
                name: 'Personal Gym Routine',
                scheduleType: client_1.ScheduleType.DAILY,
                timezone: 'UTC',
                startDate: '2026-07-10',
            });
            const link = await roomsService.linkPersonalHabit(userId, room.id, roomHabit.id, personalHabit.id);
            expect(link).toBeDefined();
            expect(link.unlinkedAt).toBeNull();
            const roomHabit2 = await roomsService.createRoomHabit(userId, room.id, 'Gym Habit Two');
            await expect(roomsService.linkPersonalHabit(userId, room.id, roomHabit2.id, personalHabit.id)).rejects.toThrow(common_1.ConflictException);
            await checkInsService.checkIn(userId, personalHabit.id, {
                localDate: '2026-07-10',
                timezoneAtCompletion: 'UTC',
                idempotencyKey: 'linked-checkin-key-1',
            });
            const activitiesBefore = await prisma.activity.findMany({
                where: { roomId: room.id, type: client_1.ActivityType.HABIT_COMPLETED },
            });
            expect(activitiesBefore.length).toBe(1);
            expect(activitiesBefore[0].message).toContain('completed "Personal Gym Routine"');
            const unlinked = await roomsService.unlinkPersonalHabit(userId, room.id, roomHabit.id);
            expect(unlinked.unlinkedAt).not.toBeNull();
            await checkInsService.checkIn(userId, personalHabit.id, {
                localDate: '2026-07-11',
                timezoneAtCompletion: 'UTC',
                idempotencyKey: 'linked-checkin-key-2',
            });
            const activitiesAfter = await prisma.activity.findMany({
                where: { roomId: room.id, type: client_1.ActivityType.HABIT_COMPLETED },
            });
            expect(activitiesAfter.length).toBe(1);
        });
    });
});
//# sourceMappingURL=database-integration.spec.js.map