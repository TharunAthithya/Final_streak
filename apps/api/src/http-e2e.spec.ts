import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ScheduleType, HabitStatus } from '@prisma/client';

describe('NestJS HTTP E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const JWT_SECRET = 'http-e2e-secret-key';
  let tokenUser1: string;
  let tokenUser2: string;
  const user1Id = 'c0000000-0000-0000-0000-000000000001';
  const user2Id = 'c0000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'development';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await cleanDb();

    // Create cryptographic tokens
    tokenUser1 = jwt.sign({ sub: user1Id, email: 'e2e1@example.com' }, JWT_SECRET);
    tokenUser2 = jwt.sign({ sub: user2Id, email: 'e2e2@example.com' }, JWT_SECRET);
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
    await app.close();
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

  describe('Unauthenticated and Validation Gateways', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });

    it('should reject requests with invalid token signatures', async () => {
      const badToken = jwt.sign({ sub: user1Id }, 'wrong-secret');
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${badToken}`)
        .expect(401);
    });

    it('should query health check endpoint successfully', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBe('connected');
    });
  });

  describe('User and Habits CRUD', () => {
    let habitId: string;

    it('should auto-register and return profile detail on GET /users/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(res.body.email).toBe('e2e1@example.com');
      // Set display name so the user has one
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ displayName: 'User One', timezone: 'UTC' })
        .expect(200);
    });

    it('should create a new habit', async () => {
      const res = await request(app.getHttpServer())
        .post('/habits')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          name: 'Morning Gym',
          scheduleType: ScheduleType.DAILY,
          timezone: 'UTC',
          startDate: '2026-07-10',
        })
        .expect(201);

      expect(res.body.name).toBe('Morning Gym');
      habitId = res.body.id;
    });

    it('should check in a habit', async () => {
      const res = await request(app.getHttpServer())
        .post(`/habits/${habitId}/check-in`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          localDate: '2026-07-10',
          timezoneAtCompletion: 'UTC',
          idempotencyKey: 'http-e2e-idemp-1',
        })
        .expect(201);

      expect(res.body.checkIn).toBeDefined();
      expect(res.body.stats.currentStreak).toBe(1);
    });
  });

  describe('Rooms accountability linkages and activities', () => {
    let roomId: string;
    let roomHabitId: string;
    let personalHabitId: string;

    it('should create room, join, add habit link, and post activities', async () => {
      // 1. Create Room
      const roomRes = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          name: 'Gym Accountability Team',
          description: 'Team workout goals',
          visibility: 'PUBLIC',
        })
        .expect(201);

      roomId = roomRes.body.id;
      const inviteCode = roomRes.body.inviteCode;

      // Ensure User Two can join
      await request(app.getHttpServer())
        .post('/rooms/join')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ inviteCode })
        .expect(201);

      // 2. Create target Room Habit
      const roomHabitRes = await request(app.getHttpServer())
        .post(`/rooms/${roomId}/habits`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ name: 'Work Out' })
        .expect(201);

      roomHabitId = roomHabitRes.body.id;

      // 3. Create User Two personal habit
      const personalRes = await request(app.getHttpServer())
        .post('/habits')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({
          name: 'Gym Session',
          scheduleType: ScheduleType.DAILY,
          timezone: 'UTC',
          startDate: '2026-07-10',
        })
        .expect(201);

      personalHabitId = personalRes.body.id;

      // 4. Link User Two personal habit to Room Habit
      await request(app.getHttpServer())
        .post(`/rooms/${roomId}/habits/${roomHabitId}/link`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ personalHabitId })
        .expect(201);

      // 5. User Two checks in
      await request(app.getHttpServer())
        .post(`/habits/${personalHabitId}/check-in`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({
          localDate: '2026-07-10',
          timezoneAtCompletion: 'UTC',
          idempotencyKey: 'http-e2e-idemp-2',
        })
        .expect(201);

      // 6. Verify activity feed contains completion activity
      const activityRes = await request(app.getHttpServer())
        .get(`/rooms/${roomId}/activity`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(activityRes.body.length).toBeGreaterThan(0);
      const completionAct = activityRes.body.find((a: any) => a.type === 'HABIT_COMPLETED');
      expect(completionAct).toBeDefined();

      // 7. Toggle Reaction on Activity
      const reactRes = await request(app.getHttpServer())
        .post(`/activities/${completionAct.id}/react`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ type: 'fire' })
        .expect(201);

      expect(reactRes.body.reacted).toBe(true);

      // 8. Fetch Leaderboard
      const leaderboardRes = await request(app.getHttpServer())
        .get(`/rooms/${roomId}/leaderboard?period=weekly`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(leaderboardRes.body.length).toBe(2);
      expect(leaderboardRes.body[0].score).toBe(1); // User Two has 1 completion
    });
  });
});
