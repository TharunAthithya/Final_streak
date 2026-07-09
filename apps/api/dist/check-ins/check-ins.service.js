"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckInsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const streak_engine_1 = require("./streak-engine");
const client_1 = require("@prisma/client");
let CheckInsService = class CheckInsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkIn(userId, habitId, dto) {
        const habit = await this.prisma.habit.findUnique({
            where: { id: habitId },
            include: { scheduleDays: true },
        });
        if (!habit)
            throw new common_1.NotFoundException('Habit not found');
        if (habit.userId !== userId)
            throw new common_1.ForbiddenException('You do not own this habit');
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.checkIn.findUnique({
                where: { idempotencyKey: dto.idempotencyKey },
            });
            if (existing) {
                throw new common_1.ConflictException('Habit already completed for this date (Idempotency trigger)');
            }
            const localDateObj = new Date(dto.localDate);
            const duplicateLocalDate = await tx.checkIn.findFirst({
                where: {
                    habitId,
                    localDate: localDateObj,
                },
            });
            if (duplicateLocalDate) {
                throw new common_1.ConflictException('Habit already completed for this date');
            }
            const checkIn = await tx.checkIn.create({
                data: {
                    userId,
                    habitId,
                    localDate: localDateObj,
                    completedAtUtc: new Date(),
                    timezoneAtCompletion: dto.timezoneAtCompletion,
                    idempotencyKey: dto.idempotencyKey,
                },
            });
            const allCheckIns = await tx.checkIn.findMany({
                where: { habitId },
                select: { localDate: true },
                orderBy: { localDate: 'desc' },
            });
            const dates = allCheckIns.map((c) => c.localDate.toISOString().split('T')[0]);
            const computed = streak_engine_1.StreakEngine.calculate(habit.scheduleType, habit.startDate, dates, dto.timezoneAtCompletion, habit.scheduleDays.map((d) => d.dayOfWeek), habit.targetPerWeek || 1);
            const stats = await tx.habitStats.update({
                where: { habitId },
                data: {
                    currentStreak: computed.currentStreak,
                    bestStreak: computed.bestStreak,
                    totalCompletions: computed.totalCompletions,
                    completionRate: computed.completionRate,
                    recalculatedAt: new Date(),
                },
            });
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const xpEarned = 10;
            const newXp = user.xp + xpEarned;
            const newLevel = Math.floor(newXp / 100) + 1;
            const levelUp = newLevel > user.level;
            await tx.user.update({
                where: { id: userId },
                data: {
                    xp: newXp,
                    level: newLevel,
                },
            });
            const activeLinks = await tx.roomHabitLink.findMany({
                where: {
                    personalHabitId: habitId,
                    unlinkedAt: null,
                    roomMember: {
                        leftAt: null,
                    },
                },
                include: {
                    roomMember: {
                        include: {
                            room: true,
                        },
                    },
                },
            });
            for (const link of activeLinks) {
                const room = link.roomMember.room;
                const msg = `${user.displayName} completed "${habit.name}" satisfying target "${room.name}" (Streak: ${stats.currentStreak} days)`;
                await tx.activity.create({
                    data: {
                        actorUserId: userId,
                        roomId: room.id,
                        roomHabitLinkId: link.id,
                        type: client_1.ActivityType.HABIT_COMPLETED,
                        message: msg,
                        visibility: room.visibility,
                        deduplicationKey: `${userId}:${habitId}:${dto.localDate}:${room.id}`,
                        metadataJson: {
                            habitName: habit.name,
                            currentStreak: stats.currentStreak,
                            localDate: dto.localDate,
                        },
                    },
                });
            }
            return {
                checkIn,
                stats,
                xpAwarded: xpEarned,
                levelUp,
            };
        });
    }
    async undoCheckIn(userId, habitId, checkInId) {
        const habit = await this.prisma.habit.findUnique({
            where: { id: habitId },
            include: { scheduleDays: true },
        });
        if (!habit)
            throw new common_1.NotFoundException('Habit not found');
        if (habit.userId !== userId)
            throw new common_1.ForbiddenException('You do not own this habit');
        return this.prisma.$transaction(async (tx) => {
            const checkIn = await tx.checkIn.findUnique({ where: { id: checkInId } });
            if (!checkIn)
                throw new common_1.NotFoundException('Check-in not found');
            await tx.checkIn.delete({ where: { id: checkInId } });
            const allCheckIns = await tx.checkIn.findMany({
                where: { habitId },
                select: { localDate: true },
                orderBy: { localDate: 'desc' },
            });
            const dates = allCheckIns.map((c) => c.localDate.toISOString().split('T')[0]);
            const computed = streak_engine_1.StreakEngine.calculate(habit.scheduleType, habit.startDate, dates, checkIn.timezoneAtCompletion, habit.scheduleDays.map((d) => d.dayOfWeek), habit.targetPerWeek || 1);
            const stats = await tx.habitStats.update({
                where: { habitId },
                data: {
                    currentStreak: computed.currentStreak,
                    bestStreak: computed.bestStreak,
                    totalCompletions: computed.totalCompletions,
                    completionRate: computed.completionRate,
                    recalculatedAt: new Date(),
                },
            });
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (user) {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        xp: Math.max(0, user.xp - 10),
                        level: Math.max(1, Math.floor(Math.max(0, user.xp - 10) / 100) + 1),
                    },
                });
            }
            await tx.activity.deleteMany({
                where: {
                    actorUserId: userId,
                    type: client_1.ActivityType.HABIT_COMPLETED,
                    deduplicationKey: {
                        startsWith: `${userId}:${habitId}:${checkIn.localDate.toISOString().split('T')[0]}:`,
                    },
                },
            });
            return stats;
        });
    }
};
exports.CheckInsService = CheckInsService;
exports.CheckInsService = CheckInsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CheckInsService);
//# sourceMappingURL=check-ins.service.js.map