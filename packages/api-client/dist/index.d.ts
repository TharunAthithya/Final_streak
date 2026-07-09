import { UserResponse, HabitResponse, CheckInResponse, RoomResponse, ActivityResponse } from '@streak/contracts';
import { CreateHabitDto, CheckInDto, CreateRoomDto, JoinRoomDto, UpdateUserDto } from '@streak/validation';
export declare class StreakApiClient {
    private baseUrl;
    private token;
    constructor(baseUrl: string);
    setToken(token: string | null): void;
    private request;
    getMe(): Promise<UserResponse>;
    updateProfile(dto: UpdateUserDto): Promise<UserResponse>;
    deleteAccount(): Promise<{
        success: boolean;
    }>;
    getHabits(includeArchived?: boolean): Promise<HabitResponse[]>;
    createHabit(dto: CreateHabitDto): Promise<HabitResponse>;
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
    getRooms(): Promise<RoomResponse[]>;
    createRoom(dto: CreateRoomDto): Promise<RoomResponse>;
    joinRoom(dto: JoinRoomDto): Promise<RoomResponse>;
    leaveRoom(roomId: string): Promise<{
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
    getRoomActivity(roomId: string): Promise<ActivityResponse[]>;
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
}
