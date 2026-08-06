import { SupabaseClient } from '@supabase/supabase-js';
import { UserResponse, HabitResponse, CheckInResponse, RoomResponse, ReflectionResponse, CreateReflectionDto } from '@streak/contracts';
import { CreateHabitDto, CheckInDto, CreateRoomDto, JoinRoomDto, UpdateUserDto } from '@streak/validation';
export declare class StreakApiClient {
    supabase: SupabaseClient;
    constructor(supabaseUrl: string, supabaseAnonKey: string, options?: any);
    getMe(): Promise<UserResponse>;
    updateProfile(dto: UpdateUserDto): Promise<UserResponse>;
    getHabits(includeArchived?: boolean): Promise<HabitResponse[]>;
    createHabit(dto: CreateHabitDto): Promise<HabitResponse>;
    getHabitCheckIns(habitId: string, limit?: number): Promise<CheckInResponse[]>;
    deleteHabit(habitId: string): Promise<{
        success: boolean;
    }>;
    checkInHabit(habitId: string, dto: CheckInDto): Promise<{
        checkIn: CheckInResponse;
        stats: {
            currentStreak: number;
            bestStreak: number;
            totalCompletions: number;
        };
        xpAwarded: number;
        levelUp: boolean;
    }>;
    undoCheckIn(habitId: string, checkInId: string): Promise<{
        currentStreak: number;
        bestStreak: number;
        totalCompletions: number;
    }>;
    freezeHabit(habitId: string, dto: CheckInDto): Promise<{
        checkIn: CheckInResponse;
        stats: {
            currentStreak: number;
            bestStreak: number;
            totalCompletions: number;
        };
        freezeDaysAvailable: number;
    }>;
    undoFreeze(habitId: string, checkInId: string): Promise<{
        stats: {
            currentStreak: number;
            bestStreak: number;
            totalCompletions: number;
        };
        freezeDaysAvailable: number;
    }>;
    getRooms(): Promise<RoomResponse[]>;
    createRoom(dto: CreateRoomDto): Promise<RoomResponse>;
    joinRoom(dto: JoinRoomDto): Promise<RoomResponse & {
        requestSent?: boolean;
        roomName?: string;
    }>;
    alignRoomHabitsForUser(roomId: string): Promise<void>;
    leaveRoom(roomId: string): Promise<{
        success: boolean;
    }>;
    deleteRoom(roomId: string): Promise<{
        success: boolean;
    }>;
    getRoomDetails(roomId: string): Promise<RoomResponse & {
        roomHabits: Array<{
            id: string;
            name: string;
            description: string | null;
        }>;
        members: Array<{
            id: string;
            role: string;
            user: UserResponse;
        }>;
    }>;
    createRoomHabit(roomId: string, name: string, description?: string): Promise<any>;
    archiveRoomHabit(roomId: string, roomHabitId: string): Promise<any>;
    linkPersonalHabit(roomId: string, roomHabitId: string, personalHabitId: string): Promise<any>;
    unlinkPersonalHabit(roomId: string, roomHabitId: string): Promise<any>;
    getRoomActivity(roomId: string): Promise<any[]>;
    toggleActivityReaction(activityId: string, reactionType: string): Promise<any>;
    getRoomMembers(roomId: string): Promise<Array<{
        profileId: string;
        displayName: string;
        username: string;
        role: string;
        joinedAt: string;
        isYou: boolean;
    }>>;
    getRoomLeaderboard(roomId: string, period?: string): Promise<Array<{
        userId: string;
        displayName: string;
        avatarPath?: string;
        score: number;
        rank: number;
    }>>;
    reactToActivity(activityId: string, type: string): Promise<{
        success: boolean;
        reacted: boolean;
    }>;
    deleteAccount(): Promise<{
        success: boolean;
    }>;
    forgotPassword(email: string, redirectTo?: string): Promise<{
        success: boolean;
    }>;
    resetPassword(newPassword: string): Promise<{
        success: boolean;
    }>;
    getReflectionForDate(localDate: string): Promise<ReflectionResponse | null>;
    submitReflection(dto: CreateReflectionDto): Promise<ReflectionResponse>;
    updateHabitIcon(habitId: string, iconName: string): Promise<any>;
    updateHabit(habitId: string, dto: Partial<CreateHabitDto>): Promise<any>;
    getNotifications(): Promise<any[]>;
    markNotificationRead(notificationId: string): Promise<boolean>;
    markAllNotificationsRead(): Promise<boolean>;
    respondToInvitation(invitationId: string, accept: boolean): Promise<boolean>;
    searchUsersByUsername(query: string): Promise<Array<{
        id: string;
        displayName: string;
        username: string;
        avatarPath?: string;
    }>>;
    sendRoomInvitation(roomId: string, inviteeId: string): Promise<{
        invitationId: string;
        success: boolean;
    }>;
}
