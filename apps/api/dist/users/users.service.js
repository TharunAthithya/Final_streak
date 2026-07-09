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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async updateProfile(userId, dto) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                displayName: dto.displayName,
                username: dto.username,
                timezone: dto.timezone,
                bio: dto.bio,
                avatarPath: dto.avatarPath,
            },
        });
    }
    async deleteAccount(userId) {
        return this.prisma.$transaction(async (tx) => {
            const ownedRooms = await tx.room.findMany({
                where: { ownerId: userId, archivedAt: null },
            });
            if (ownedRooms.length > 0) {
                throw new Error('You must transfer ownership or archive your rooms before deleting your account');
            }
            await tx.checkIn.deleteMany({ where: { userId } });
            await tx.habitStats.deleteMany({ where: { habit: { userId } } });
            await tx.habitScheduleDay.deleteMany({ where: { habit: { userId } } });
            await tx.habit.deleteMany({ where: { userId } });
            await tx.roomMember.deleteMany({ where: { userId } });
            await tx.activity.deleteMany({ where: { actorUserId: userId } });
            await tx.reaction.deleteMany({ where: { userId } });
            await tx.device.deleteMany({ where: { userId } });
            await tx.notificationDelivery.deleteMany({ where: { userId } });
            await tx.userAchievement.deleteMany({ where: { userId } });
            await tx.user.delete({ where: { id: userId } });
            return { success: true };
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map