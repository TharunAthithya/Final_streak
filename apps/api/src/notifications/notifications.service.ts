import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async registerDevice(userId: string, platform: string, pushToken: string) {
    return this.prisma.$transaction(async (tx) => {
      // Clean up the token if it was previously registered to a different user
      await tx.device.deleteMany({
        where: {
          pushToken,
          userId: { not: userId },
        },
      });

      // Upsert the device token for the current user
      return tx.device.upsert({
        where: {
          userId_pushToken: {
            userId,
            pushToken,
          },
        },
        create: {
          userId,
          platform,
          pushToken,
          tokenStatus: 'ACTIVE',
        },
        update: {
          platform,
          tokenStatus: 'ACTIVE',
          lastSeenAt: new Date(),
        },
      });
    });
  }

  async sendNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    deduplicationKey: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Prevent duplicate delivery by checking if deduplicationKey exists
      const existing = await tx.notificationDelivery.findUnique({
        where: { deduplicationKey },
      });
      if (existing) {
        return { status: 'duplicate', deliveryId: existing.id };
      }

      // Create pending delivery log
      const delivery = await tx.notificationDelivery.create({
        data: {
          userId,
          type,
          deduplicationKey,
          status: 'PENDING',
        },
      });

      // Get user active devices
      const devices = await tx.device.findMany({
        where: { userId, tokenStatus: 'ACTIVE' },
      });

      if (devices.length === 0) {
        await tx.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'FAILED',
            failureReason: 'No active devices registered',
          },
        });
        return { status: 'no_devices', deliveryId: delivery.id };
      }

      for (const device of devices) {
        try {
          if (device.pushToken.startsWith('ExponentPushToken')) {
            // Send request to Expo Push API
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: device.pushToken,
                sound: 'default',
                title,
                body,
                data: { type, deduplicationKey },
              }),
            });

            if (!response.ok) {
              throw new Error(`Expo Push API returned status ${response.status}`);
            }
          } else {
            console.log(`[Mock Push] Sent to platform ${device.platform}: "${title}" - ${body}`);
          }

          // Mark delivery as successful
          await tx.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              deviceId: device.id,
            },
          });
        } catch (e: any) {
          console.error(`Failed to send push to device ${device.id}:`, e.message);

          // Mark delivery as failed
          await tx.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'FAILED',
              failureReason: e.message || 'Push delivery transport error',
              deviceId: device.id,
            },
          });
        }
      }

      return { status: 'processed', deliveryId: delivery.id };
    });
  }
}
