import { PrismaService } from '../prisma/prisma.service';
export declare class LeaderboardsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRoomLeaderboard(userId: string, roomId: string, period: 'weekly' | 'monthly'): Promise<{
        rank: number;
        userId: string;
        displayName: string;
        avatarPath: string | undefined;
        score: number;
    }[]>;
}
