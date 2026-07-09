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
exports.HabitsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let HabitsService = class HabitsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createHabit(userId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const habit = await tx.habit.create({
                data: {
                    userId,
                    name: dto.name,
                    description: dto.description,
                    icon: dto.icon,
                    scheduleType: dto.scheduleType,
                    targetPerWeek: dto.targetPerWeek,
                    timezone: dto.timezone,
                    startDate: new Date(dto.startDate),
                    status: client_1.HabitStatus.ACTIVE,
                },
            });
            if (dto.scheduleType === 'SPECIFIC_DAYS' && dto.daysOfWeek) {
                await tx.habitScheduleDay.createMany({
                    data: dto.daysOfWeek.map((day) => ({
                        habitId: habit.id,
                        dayOfWeek: day,
                    })),
                });
            }
            await tx.habitStats.create({
                data: {
                    habitId: habit.id,
                    currentStreak: 0,
                    bestStreak: 0,
                    totalCompletions: 0,
                    completionRate: 0.00,
                },
            });
            return habit;
        });
    }
    async getHabits(userId, includeArchived = false) {
        return this.prisma.habit.findMany({
            where: {
                userId,
                status: includeArchived ? undefined : { not: client_1.HabitStatus.ARCHIVED },
            },
            include: {
                stats: true,
                scheduleDays: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getHabitById(userId, habitId) {
        const habit = await this.prisma.habit.findUnique({
            where: { id: habitId },
            include: {
                stats: true,
                scheduleDays: true,
                checkIns: {
                    orderBy: { localDate: 'desc' },
                    take: 30,
                },
            },
        });
        if (!habit) {
            throw new common_1.NotFoundException('Habit not found');
        }
        if (habit.userId !== userId) {
            throw new common_1.ForbiddenException('You do not own this habit');
        }
        return habit;
    }
    async updateHabit(userId, habitId, dto) {
        const habit = await this.prisma.habit.findUnique({ where: { id: habitId } });
        if (!habit)
            throw new common_1.NotFoundException('Habit not found');
        if (habit.userId !== userId)
            throw new common_1.ForbiddenException('You do not own this habit');
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.habit.update({
                where: { id: habitId },
                data: {
                    name: dto.name,
                    description: dto.description,
                    icon: dto.icon,
                    scheduleType: dto.scheduleType,
                    targetPerWeek: dto.targetPerWeek,
                    timezone: dto.timezone,
                    startDate: new Date(dto.startDate),
                },
            });
            await tx.habitScheduleDay.deleteMany({ where: { habitId } });
            if (dto.scheduleType === 'SPECIFIC_DAYS' && dto.daysOfWeek) {
                await tx.habitScheduleDay.createMany({
                    data: dto.daysOfWeek.map((day) => ({
                        habitId,
                        dayOfWeek: day,
                    })),
                });
            }
            return updated;
        });
    }
    async archiveHabit(userId, habitId) {
        const habit = await this.prisma.habit.findUnique({ where: { id: habitId } });
        if (!habit)
            throw new common_1.NotFoundException('Habit not found');
        if (habit.userId !== userId)
            throw new common_1.ForbiddenException('You do not own this habit');
        return this.prisma.habit.update({
            where: { id: habitId },
            data: {
                status: client_1.HabitStatus.ARCHIVED,
                archivedAt: new Date(),
            },
        });
    }
    async deleteHabit(userId, habitId) {
        const habit = await this.prisma.habit.findUnique({ where: { id: habitId } });
        if (!habit)
            throw new common_1.NotFoundException('Habit not found');
        if (habit.userId !== userId)
            throw new common_1.ForbiddenException('You do not own this habit');
        await this.prisma.habit.delete({ where: { id: habitId } });
        return { success: true };
    }
};
exports.HabitsService = HabitsService;
exports.HabitsService = HabitsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HabitsService);
//# sourceMappingURL=habits.service.js.map