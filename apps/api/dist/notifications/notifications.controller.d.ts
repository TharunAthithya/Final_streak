import { User } from '@prisma/client';
import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    registerDevice(user: User, platform: string, pushToken: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        platform: string;
        pushToken: string;
        tokenStatus: string;
        appVersion: string | null;
        lastSeenAt: Date;
    }>;
}
