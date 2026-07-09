import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from '@streak/validation';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<User> {
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

  async deleteAccount(userId: string): Promise<{ success: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      // Check if user is owner of any active rooms
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
}
