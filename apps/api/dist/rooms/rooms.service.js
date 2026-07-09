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
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let RoomsService = class RoomsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createRoom(ownerId, dto) {
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        return this.prisma.$transaction(async (tx) => {
            const room = await tx.room.create({
                data: {
                    ownerId,
                    name: dto.name,
                    description: dto.description,
                    visibility: dto.visibility,
                    inviteCode,
                },
            });
            await tx.roomMember.create({
                data: {
                    roomId: room.id,
                    userId: ownerId,
                    role: client_1.RoomRole.OWNER,
                },
            });
            return room;
        });
    }
    async joinRoom(userId, dto) {
        const room = await this.prisma.room.findUnique({
            where: { inviteCode: dto.inviteCode },
        });
        if (!room)
            throw new common_1.NotFoundException('Room not found with the provided invite code');
        return this.prisma.$transaction(async (tx) => {
            const existingActive = await tx.roomMember.findFirst({
                where: {
                    roomId: room.id,
                    userId,
                    leftAt: null,
                },
            });
            if (existingActive) {
                throw new common_1.ConflictException('You are already an active member of this room');
            }
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const pastMembership = await tx.roomMember.findFirst({
                where: {
                    roomId: room.id,
                    userId,
                    leftAt: { not: null },
                },
            });
            let member;
            if (pastMembership) {
                member = await tx.roomMember.update({
                    where: { id: pastMembership.id },
                    data: {
                        leftAt: null,
                        joinedAt: new Date(),
                        role: client_1.RoomRole.MEMBER,
                    },
                });
            }
            else {
                member = await tx.roomMember.create({
                    data: {
                        roomId: room.id,
                        userId,
                        role: client_1.RoomRole.MEMBER,
                    },
                });
            }
            await tx.activity.create({
                data: {
                    actorUserId: userId,
                    roomId: room.id,
                    type: client_1.ActivityType.ROOM_JOIN,
                    message: `${user.displayName} joined the room`,
                    visibility: room.visibility,
                    deduplicationKey: `join:${userId}:${room.id}:${Date.now()}`,
                },
            });
            return { room, member };
        });
    }
    async leaveRoom(userId, roomId) {
        const member = await this.prisma.roomMember.findFirst({
            where: { roomId, userId, leftAt: null },
        });
        if (!member)
            throw new common_1.NotFoundException('Active room membership not found');
        if (member.role === client_1.RoomRole.OWNER) {
            throw new common_1.ConflictException('Owners cannot leave without transferring ownership first');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.roomMember.update({
                where: { id: member.id },
                data: { leftAt: new Date() },
            });
            await tx.roomHabitLink.updateMany({
                where: {
                    roomMemberId: member.id,
                    unlinkedAt: null,
                },
                data: {
                    unlinkedAt: new Date(),
                },
            });
            return { success: true };
        });
    }
    async createRoomHabit(userId, roomId, name, description) {
        const member = await this.prisma.roomMember.findFirst({
            where: { roomId, userId, leftAt: null },
        });
        if (!member)
            throw new common_1.ForbiddenException('You are not a member of this room');
        if (member.role !== client_1.RoomRole.OWNER && member.role !== client_1.RoomRole.ADMIN) {
            throw new common_1.ForbiddenException('Only room Owners or Admins can define accountability targets');
        }
        return this.prisma.roomHabit.create({
            data: {
                roomId,
                name,
                description,
            },
        });
    }
    async archiveRoomHabit(userId, roomId, roomHabitId) {
        const member = await this.prisma.roomMember.findFirst({
            where: { roomId, userId, leftAt: null },
        });
        if (!member)
            throw new common_1.ForbiddenException('You are not a member of this room');
        if (member.role !== client_1.RoomRole.OWNER && member.role !== client_1.RoomRole.ADMIN) {
            throw new common_1.ForbiddenException('Only room Owners or Admins can archive room habits');
        }
        return this.prisma.$transaction(async (tx) => {
            const archived = await tx.roomHabit.update({
                where: { id: roomHabitId },
                data: { archivedAt: new Date() },
            });
            await tx.roomHabitLink.updateMany({
                where: {
                    roomHabitId,
                    unlinkedAt: null,
                },
                data: {
                    unlinkedAt: new Date(),
                },
            });
            return archived;
        });
    }
    async linkPersonalHabit(userId, roomId, roomHabitId, personalHabitId) {
        const member = await this.prisma.roomMember.findFirst({
            where: { roomId, userId, leftAt: null },
        });
        if (!member)
            throw new common_1.ForbiddenException('You are not an active member of this room');
        const habit = await this.prisma.habit.findUnique({ where: { id: personalHabitId } });
        if (!habit)
            throw new common_1.NotFoundException('Personal habit not found');
        if (habit.userId !== userId)
            throw new common_1.ForbiddenException('You do not own this personal habit');
        const roomHabit = await this.prisma.roomHabit.findUnique({ where: { id: roomHabitId } });
        if (!roomHabit || roomHabit.archivedAt) {
            throw new common_1.NotFoundException('Active room habit target not found');
        }
        return this.prisma.$transaction(async (tx) => {
            const existingLinkTarget = await tx.roomHabitLink.findFirst({
                where: {
                    roomMemberId: member.id,
                    roomHabitId,
                    unlinkedAt: null,
                },
            });
            if (existingLinkTarget) {
                throw new common_1.ConflictException('You have already linked a personal habit to this Room Habit');
            }
            const existingHabitLink = await tx.roomHabitLink.findFirst({
                where: {
                    roomMemberId: member.id,
                    personalHabitId,
                    unlinkedAt: null,
                },
            });
            if (existingHabitLink) {
                throw new common_1.ConflictException('This personal habit is already linked to another Room Habit in this room');
            }
            return tx.roomHabitLink.create({
                data: {
                    roomMemberId: member.id,
                    roomHabitId,
                    personalHabitId,
                },
            });
        });
    }
    async unlinkPersonalHabit(userId, roomId, roomHabitId) {
        const member = await this.prisma.roomMember.findFirst({
            where: { roomId, userId, leftAt: null },
        });
        if (!member)
            throw new common_1.ForbiddenException('You are not an active member of this room');
        const link = await this.prisma.roomHabitLink.findFirst({
            where: {
                roomMemberId: member.id,
                roomHabitId,
                unlinkedAt: null,
            },
        });
        if (!link)
            throw new common_1.NotFoundException('Active link not found');
        return this.prisma.roomHabitLink.update({
            where: { id: link.id },
            data: { unlinkedAt: new Date() },
        });
    }
    async getRooms(userId) {
        return this.prisma.room.findMany({
            where: {
                members: {
                    some: {
                        userId,
                        leftAt: null,
                    },
                },
            },
            include: {
                members: {
                    where: { leftAt: null },
                    include: {
                        user: {
                            select: { displayName: true, avatarPath: true },
                        },
                    },
                },
            },
        });
    }
    async getRoomDetails(userId, roomId) {
        const member = await this.prisma.roomMember.findFirst({
            where: { roomId, userId, leftAt: null },
        });
        if (!member)
            throw new common_1.ForbiddenException('You are not an active member of this room');
        return this.prisma.room.findUnique({
            where: { id: roomId },
            include: {
                roomHabits: {
                    where: { archivedAt: null },
                },
                members: {
                    where: { leftAt: null },
                    include: {
                        user: true,
                    },
                },
            },
        });
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map