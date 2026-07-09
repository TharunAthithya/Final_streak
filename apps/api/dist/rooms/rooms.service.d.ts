import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, JoinRoomDto } from '@streak/validation';
export declare class RoomsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createRoom(ownerId: string, dto: CreateRoomDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        description: string | null;
        imagePath: string | null;
        visibility: import("@prisma/client").$Enums.RoomVisibility;
        inviteCode: string | null;
        archivedAt: Date | null;
    }>;
    joinRoom(userId: string, dto: JoinRoomDto): Promise<{
        room: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            ownerId: string;
            description: string | null;
            imagePath: string | null;
            visibility: import("@prisma/client").$Enums.RoomVisibility;
            inviteCode: string | null;
            archivedAt: Date | null;
        };
        member: {
            id: string;
            userId: string;
            roomId: string;
            role: import("@prisma/client").$Enums.RoomRole;
            joinedAt: Date;
            leftAt: Date | null;
        };
    }>;
    leaveRoom(userId: string, roomId: string): Promise<{
        success: boolean;
    }>;
    createRoomHabit(userId: string, roomId: string, name: string, description?: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        archivedAt: Date | null;
        roomId: string;
    }>;
    archiveRoomHabit(userId: string, roomId: string, roomHabitId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        archivedAt: Date | null;
        roomId: string;
    }>;
    linkPersonalHabit(userId: string, roomId: string, roomHabitId: string, personalHabitId: string): Promise<{
        id: string;
        roomMemberId: string;
        roomHabitId: string;
        personalHabitId: string;
        linkedAt: Date;
        unlinkedAt: Date | null;
    }>;
    unlinkPersonalHabit(userId: string, roomId: string, roomHabitId: string): Promise<{
        id: string;
        roomMemberId: string;
        roomHabitId: string;
        personalHabitId: string;
        linkedAt: Date;
        unlinkedAt: Date | null;
    }>;
    getRooms(userId: string): Promise<({
        members: ({
            user: {
                displayName: string;
                avatarPath: string | null;
            };
        } & {
            id: string;
            userId: string;
            roomId: string;
            role: import("@prisma/client").$Enums.RoomRole;
            joinedAt: Date;
            leftAt: Date | null;
        })[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        description: string | null;
        imagePath: string | null;
        visibility: import("@prisma/client").$Enums.RoomVisibility;
        inviteCode: string | null;
        archivedAt: Date | null;
    })[]>;
    getRoomDetails(userId: string, roomId: string): Promise<({
        members: ({
            user: {
                id: string;
                authUserId: string;
                email: string;
                username: string | null;
                displayName: string;
                avatarPath: string | null;
                bio: string | null;
                timezone: string;
                locale: string;
                xp: number;
                level: number;
                onboardingCompletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            };
        } & {
            id: string;
            userId: string;
            roomId: string;
            role: import("@prisma/client").$Enums.RoomRole;
            joinedAt: Date;
            leftAt: Date | null;
        })[];
        roomHabits: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            archivedAt: Date | null;
            roomId: string;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        description: string | null;
        imagePath: string | null;
        visibility: import("@prisma/client").$Enums.RoomVisibility;
        inviteCode: string | null;
        archivedAt: Date | null;
    }) | null>;
}
