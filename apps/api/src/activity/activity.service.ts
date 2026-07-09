import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoomActivity(userId: string, roomId: string) {
    // Verify active room membership
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('You are not a member of this room');

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

    // Map reactions to structured aggregated shape and flag user's own reactions
    return activities.map((activity) => {
      const reactionsGrouped: Record<string, { count: number; userReacted: boolean }> = {};

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
        metadataJson: (activity.metadataJson as Record<string, any>) || undefined,
        createdAt: activity.createdAt.toISOString(),
        reactions: reactionsList,
      };
    });
  }

  async reactToActivity(userId: string, activityId: string, type: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Activity not found');

    // Verify membership if target activity is scoped within a room
    if (activity.roomId) {
      const member = await this.prisma.roomMember.findFirst({
        where: { roomId: activity.roomId, userId, leftAt: null },
      });
      if (!member) throw new ForbiddenException('You are not a member of this room');
    }

    return this.prisma.$transaction(async (tx) => {
      // Toggle reaction: delete if exists, create if not
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
      } else {
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
}
