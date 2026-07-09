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
exports.ActivityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ActivityService = class ActivityService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRoomActivity(userId, roomId) {
        const member = await this.prisma.roomMember.findFirst({
            where: { roomId, userId, leftAt: null },
        });
        if (!member)
            throw new common_1.ForbiddenException('You are not a member of this room');
        const activities = await this.prisma.activity.findMany({
            where: { roomId },
            include: {
                actor: {
                    select: { displayName: true, avatarPath: true },
                },
                reactions: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return activities.map((activity) => {
            const reactionsGrouped = {};
            activity.reactions.forEach((reaction) => {
                if (!reactionsGrouped[reaction.type]) {
                    reactionsGrouped[reaction.type] = { count: 0, userReacted: false };
                }
                reactionsGrouped[reaction.type].count++;
                if (reaction.userId === userId) {
                    reactionsGrouped[reaction.type].userReacted = true;
                }
            });
            const reactionsList = Object.entries(reactionsGrouped).map(([type, data]) => ({
                type,
                count: data.count,
                userReacted: data.userReacted,
            }));
            return {
                id: activity.id,
                actorUserId: activity.actorUserId,
                actorDisplayName: activity.actor.displayName,
                actorAvatarPath: activity.actor.avatarPath || undefined,
                roomId: activity.roomId || undefined,
                type: activity.type,
                message: activity.message,
                metadataJson: activity.metadataJson || undefined,
                createdAt: activity.createdAt.toISOString(),
                reactions: reactionsList,
            };
        });
    }
    async reactToActivity(userId, activityId, type) {
        const activity = await this.prisma.activity.findUnique({
            where: { id: activityId },
        });
        if (!activity)
            throw new common_1.NotFoundException('Activity not found');
        if (activity.roomId) {
            const member = await this.prisma.roomMember.findFirst({
                where: { roomId: activity.roomId, userId, leftAt: null },
            });
            if (!member)
                throw new common_1.ForbiddenException('You are not a member of this room');
        }
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.reaction.findUnique({
                where: {
                    activityId_userId_type: {
                        activityId,
                        userId,
                        type,
                    },
                },
            });
            if (existing) {
                await tx.reaction.delete({
                    where: { id: existing.id },
                });
                return { success: true, reacted: false };
            }
            else {
                await tx.reaction.create({
                    data: {
                        activityId,
                        userId,
                        type,
                    },
                });
                return { success: true, reacted: true };
            }
        });
    }
};
exports.ActivityService = ActivityService;
exports.ActivityService = ActivityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityService);
//# sourceMappingURL=activity.service.js.map