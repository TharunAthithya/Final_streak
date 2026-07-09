import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from '@streak/validation';
export declare class CheckInsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    checkIn(userId: string, habitId: string, dto: CheckInDto): Promise<{
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
    undoCheckIn(userId: string, habitId: string, checkInId: string): Promise<{
        currentStreak: number;
        bestStreak: number;
        totalCompletions: number;
        completionRate: import("@prisma/client/runtime/library").Decimal;
        recalculatedAt: Date;
        habitId: string;
    }>;
}
