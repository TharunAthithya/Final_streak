import { User } from '@prisma/client';
import { LeaderboardsService } from './leaderboards.service';
export declare class LeaderboardsController {
    private readonly leaderboardsService;
    constructor(leaderboardsService: LeaderboardsService);
    getRoomLeaderboard(user: User, id: string, period?: 'weekly' | 'monthly'): Promise<{
        rank: number;
        userId: string;
        displayName: string;
        avatarPath: string | undefined;
        score: number;
    }[]>;
}
