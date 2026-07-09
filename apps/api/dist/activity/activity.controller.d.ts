import { User } from '@prisma/client';
import { ActivityService } from './activity.service';
export declare class ActivityController {
    private readonly activityService;
    constructor(activityService: ActivityService);
    getRoomActivity(user: User, roomId: string): Promise<{
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
    reactToActivity(user: User, id: string, type: string): Promise<{
        success: boolean;
        reacted: boolean;
    }>;
}
