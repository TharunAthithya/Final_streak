import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    registerDevice(userId: string, platform: string, pushToken: string): Promise<{
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
    sendNotification(userId: string, type: string, title: string, body: string, deduplicationKey: string): Promise<{
        status: string;
        deliveryId: string;
    }>;
}
