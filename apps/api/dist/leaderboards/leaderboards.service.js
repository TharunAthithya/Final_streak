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
exports.LeaderboardsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LeaderboardsService = class LeaderboardsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRoomLeaderboard(userId, roomId, period) {
        const member = await this.prisma.roomMember.findFirst({
            where: { roomId, userId, leftAt: null },
        });
        if (!member)
            throw new common_1.ForbiddenException('You are not a member of this room');
        const members = await this.prisma.roomMember.findMany({
            where: { roomId, leftAt: null },
            include: {
                user: { select: { id: true, displayName: true, avatarPath: true } },
                roomHabitLinks: {
                    select: { personalHabitId: true },
                },
            },
        });
        const now = new Date();
        let startDate;
        if (period === 'weekly') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            startDate = new Date(now.setDate(diff));
            startDate.setHours(0, 0, 0, 0);
        }
        else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        const leaderboard = await Promise.all(members.map(async (m) => {
            const habitIds = m.roomHabitLinks.map((link) => link.personalHabitId);
            if (habitIds.length === 0) {
                return { userId: m.userId, displayName: m.user.displayName, avatarPath: m.user.avatarPath || undefined, score: 0 };
            }
            const checkInCount = await this.prisma.checkIn.count({
                where: {
                    userId: m.userId,
                    habitId: { in: habitIds },
                    localDate: { gte: startDate },
                },
            });
            return {
                userId: m.userId,
                displayName: m.user.displayName,
                avatarPath: m.user.avatarPath || undefined,
                score: checkInCount,
            };
        }));
        return leaderboard
            .sort((a, b) => {
            if (b.score !== a.score)
                return b.score - a.score;
            return a.displayName.localeCompare(b.displayName);
        })
            .map((item, index) => ({
            ...item,
            rank: index + 1,
        }));
    }
};
exports.LeaderboardsService = LeaderboardsService;
exports.LeaderboardsService = LeaderboardsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeaderboardsService);
//# sourceMappingURL=leaderboards.service.js.map