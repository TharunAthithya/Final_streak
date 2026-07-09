import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, JoinRoomDto } from '@streak/validation';
import { RoomRole, RoomVisibility, ActivityType } from '@prisma/client';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(ownerId: string, dto: CreateRoomDto) {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          ownerId,
          name: dto.name,
          description: dto.description,
          visibility: dto.visibility as RoomVisibility,
          inviteCode,
        },
      });

      // Creator automatically joins as OWNER
      await tx.roomMember.create({
        data: {
          roomId: room.id,
          userId: ownerId,
          role: RoomRole.OWNER,
        },
      });

      return room;
    });
  }

  async joinRoom(userId: string, dto: JoinRoomDto) {
    const room = await this.prisma.room.findUnique({
      where: { inviteCode: dto.inviteCode },
    });
    if (!room) throw new NotFoundException('Room not found with the provided invite code');

    return this.prisma.$transaction(async (tx) => {
      // Check active membership
      const existingActive = await tx.roomMember.findFirst({
        where: {
          roomId: room.id,
          userId,
          leftAt: null,
        },
      });
      if (existingActive) {
        throw new ConflictException('You are already an active member of this room');
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      // Re-activate past membership or create new one
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
            role: RoomRole.MEMBER,
          },
        });
      } else {
        member = await tx.roomMember.create({
          data: {
            roomId: room.id,
            userId,
            role: RoomRole.MEMBER,
          },
        });
      }

      // Log join activity event
      await tx.activity.create({
        data: {
          actorUserId: userId,
          roomId: room.id,
          type: ActivityType.ROOM_JOIN,
          message: `${user.displayName} joined the room`,
          visibility: room.visibility,
          deduplicationKey: `join:${userId}:${room.id}:${Date.now()}`,
        },
      });

      return { room, member };
    });
  }

  async leaveRoom(userId: string, roomId: string) {
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!member) throw new NotFoundException('Active room membership not found');

    if (member.role === RoomRole.OWNER) {
      throw new ConflictException('Owners cannot leave without transferring ownership first');
    }

    return this.prisma.$transaction(async (tx) => {
      // Soft leave membership
      await tx.roomMember.update({
        where: { id: member.id },
        data: { leftAt: new Date() },
      });

      // Soft-unlink all active habit linkages for this member
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

  // Room Habits Targets Management
  async createRoomHabit(userId: string, roomId: string, name: string, description?: string) {
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('You are not a member of this room');
    if (member.role !== RoomRole.OWNER && member.role !== RoomRole.ADMIN) {
      throw new ForbiddenException('Only room Owners or Admins can define accountability targets');
    }

    return this.prisma.roomHabit.create({
      data: {
        roomId,
        name,
        description,
      },
    });
  }

  async archiveRoomHabit(userId: string, roomId: string, roomHabitId: string) {
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('You are not a member of this room');
    if (member.role !== RoomRole.OWNER && member.role !== RoomRole.ADMIN) {
      throw new ForbiddenException('Only room Owners or Admins can archive room habits');
    }

    return this.prisma.$transaction(async (tx) => {
      const archived = await tx.roomHabit.update({
        where: { id: roomHabitId },
        data: { archivedAt: new Date() },
      });

      // Soft unlink all active linkages associated with this habit
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

  // Explicit Room Habit Linkage
  async linkPersonalHabit(userId: string, roomId: string, roomHabitId: string, personalHabitId: string) {
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('You are not an active member of this room');

    const habit = await this.prisma.habit.findUnique({ where: { id: personalHabitId } });
    if (!habit) throw new NotFoundException('Personal habit not found');
    if (habit.userId !== userId) throw new ForbiddenException('You do not own this personal habit');

    const roomHabit = await this.prisma.roomHabit.findUnique({ where: { id: roomHabitId } });
    if (!roomHabit || roomHabit.archivedAt) {
      throw new NotFoundException('Active room habit target not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Uniqueness rule 1: A member can link only one active personal habit to a given room habit
      const existingLinkTarget = await tx.roomHabitLink.findFirst({
        where: {
          roomMemberId: member.id,
          roomHabitId,
          unlinkedAt: null,
        },
      });
      if (existingLinkTarget) {
        throw new ConflictException('You have already linked a personal habit to this Room Habit');
      }

      // Uniqueness rule 2: A personal habit can be linked to at most one active room habit at a time
      const existingHabitLink = await tx.roomHabitLink.findFirst({
        where: {
          roomMemberId: member.id,
          personalHabitId,
          unlinkedAt: null,
        },
      });
      if (existingHabitLink) {
        throw new ConflictException('This personal habit is already linked to another Room Habit in this room');
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

  async unlinkPersonalHabit(userId: string, roomId: string, roomHabitId: string) {
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('You are not an active member of this room');

    const link = await this.prisma.roomHabitLink.findFirst({
      where: {
        roomMemberId: member.id,
        roomHabitId,
        unlinkedAt: null,
      },
    });

    if (!link) throw new NotFoundException('Active link not found');

    // ONLY the link owner can voluntarily unlink their personal habit (strict auth constraint check)
    return this.prisma.roomHabitLink.update({
      where: { id: link.id },
      data: { unlinkedAt: new Date() },
    });
  }

  // Room Queries
  async getRooms(userId: string) {
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

  async getRoomDetails(userId: string, roomId: string) {
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('You are not an active member of this room');

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
}
