import { User } from '@prisma/client';
import { CheckInsService } from './check-ins.service';
import { CheckInDto } from '@streak/validation';
export declare class CheckInsController {
    private readonly checkInsService;
    constructor(checkInsService: CheckInsService);
    checkIn(user: User, habitId: string, dto: CheckInDto): Promise<{
        checkIn: {
            id: string;
            createdAt: Date;
            userId: string;
            localDate: Date;
            habitId: string;
            completedAtUtc: Date;
            timezoneAtCompletion: string;
            source: string;
            idempotencyKey: string;
        };
        stats: {
            currentStreak: number;
            bestStreak: number;
            totalCompletions: number;
            completionRate: import("@prisma/client/runtime/library").Decimal;
            recalculatedAt: Date;
            habitId: string;
        };
        xpAwarded: number;
        levelUp: boolean;
    }>;
    undoCheckIn(user: User, habitId: string, id: string): Promise<{
        currentStreak: number;
        bestStreak: number;
        totalCompletions: number;
        completionRate: import("@prisma/client/runtime/library").Decimal;
        recalculatedAt: Date;
        habitId: string;
    }>;
}
