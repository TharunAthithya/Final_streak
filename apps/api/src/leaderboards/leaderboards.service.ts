import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoomLeaderboard(userId: string, roomId: string, period: 'weekly' | 'monthly') {
    // Verify membership
    const member = await this.prisma.roomMember.findFirst({
      where: { roomId, userId, leftAt: null },
    });
    if (!member) throw new ForbiddenException('You are not a member of this room');

    // Get all active room members
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
    let startDate: Date;

    if (period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const leaderboard = await Promise.all(
      members.map(async (m) => {
        const habitIds = m.roomHabitLinks.map((link) => link.personalHabitId);
        if (habitIds.length === 0) {
          return { userId: m.userId, displayName: m.user.displayName, avatarPath: m.user.avatarPath || undefined, score: 0 };
        }

        // Count check-ins for these linked habits within the period
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
      }),
    );

    // Sort descending by score, tie break alphabetically by name
    return leaderboard
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.displayName.localeCompare(b.displayName);
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }
}
