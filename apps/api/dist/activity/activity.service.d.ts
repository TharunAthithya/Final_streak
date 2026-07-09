import { PrismaService } from '../prisma/prisma.service';
export declare class ActivityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRoomActivity(userId: string, roomId: string): Promise<{
        id: string;
        actorUserId: string;
        actorDisplayName: string;
        actorAvatarPath: string | undefined;
        roomId: string | undefined;
        type: import("@prisma/client").$Enums.ActivityType;
        message: string;
        metadataJson: Record<string, any>;
        createdAt: string;
        reactions: {
            type: string;
            count: number;
            userReacted: boolean;
        }[];
    }[]>;
    reactToActivity(userId: string, activityId: string, type: string): Promise<{
        success: boolean;
        reacted: boolean;
    }>;
}
