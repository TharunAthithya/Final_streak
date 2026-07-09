"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsService = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async registerDevice(userId, platform, pushToken) {
        return this.prisma.$transaction(async (tx) => {
            await tx.device.deleteMany({
                where: {
                    pushToken,
                    userId: { not: userId },
                },
            });
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
    async sendNotification(userId, type, title, body, deduplicationKey) {
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.notificationDelivery.findUnique({
                where: { deduplicationKey },
            });
            if (existing) {
                return { status: 'duplicate', deliveryId: existing.id };
            }
            const delivery = await tx.notificationDelivery.create({
                data: {
                    userId,
                    type,
                    deduplicationKey,
                    status: 'PENDING',
                },
            });
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
                    }
                    else {
                        console.log(`[Mock Push] Sent to platform ${device.platform}: "${title}" - ${body}`);
                    }
                    await tx.notificationDelivery.update({
                        where: { id: delivery.id },
                        data: {
                            status: 'SENT',
                            sentAt: new Date(),
                            deviceId: device.id,
                        },
                    });
                }
                catch (e) {
                    console.error(`Failed to send push to device ${device.id}:`, e.message);
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
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map