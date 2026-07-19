export declare enum HabitStatus {
    ACTIVE = "ACTIVE",
    ARCHIVED = "ARCHIVED",
    PAUSED = "PAUSED"
}
export declare enum ScheduleType {
    DAILY = "DAILY",
    SPECIFIC_DAYS = "SPECIFIC_DAYS",
    FLEXIBLE = "FLEXIBLE"
}
export declare enum RoomVisibility {
    PUBLIC = "PUBLIC",
    PRIVATE = "PRIVATE"
}
export declare enum RoomRole {
    OWNER = "OWNER",
    ADMIN = "ADMIN",
    MEMBER = "MEMBER"
}
export declare enum ActivityType {
    HABIT_COMPLETED = "HABIT_COMPLETED",
    STREAK_MILESTONE = "STREAK_MILESTONE",
    PERSONAL_BEST = "PERSONAL_BEST",
    ROOM_JOIN = "ROOM_JOIN",
    LEVEL_UP = "LEVEL_UP"
}
export interface UserResponse {
    id: string;
    email: string;
    displayName: string;
    username?: string;
    avatarPath?: string;
    bio?: string;
    timezone: string;
    xp: number;
    level: number;
    onboardingCompletedAt?: string;
    createdAt: string;
}
export interface HabitResponse {
    id: string;
    userId: string;
    name: string;
    description?: string;
    icon?: string;
    status: HabitStatus;
    scheduleType: ScheduleType;
    targetPerWeek?: number;
    timezone: string;
    startDate: string;
    reminderTime?: string | null;
    completedToday?: boolean;
    todayCheckInId?: string | null;
    archivedAt?: string;
    createdAt: string;
    stats?: HabitStatsResponse;
    checkIns?: Array<{
        id: string;
        localDate: string;
    }>;
}
export interface HabitStatsResponse {
    currentStreak: number;
    bestStreak: number;
    totalCompletions: number;
    completionRate: number;
}
export interface CheckInResponse {
    id: string;
    userId: string;
    habitId: string;
    localDate: string;
    completedAtUtc: string;
    timezoneAtCompletion: string;
    source: string;
}
export interface RoomResponse {
    id: string;
    ownerId: string;
    name: string;
    description?: string;
    imagePath?: string;
    visibility: RoomVisibility;
    inviteCode?: string;
    memberCount: number;
    activeTodayCount: number;
}
export interface ActivityResponse {
    id: string;
    actorUserId: string;
    actorDisplayName: string;
    actorAvatarPath?: string;
    roomId?: string;
    habitId?: string;
    type: ActivityType;
    message: string;
    metadataJson?: Record<string, any>;
    createdAt: string;
    reactions: Array<{
        type: string;
        count: number;
        userReacted: boolean;
    }>;
}
export interface ReflectionResponse {
    id: string;
    userId: string;
    localDate: string;
    prompt: string;
    response?: string | null;
    completedAt: string;
    createdAt: string;
    updatedAt: string;
}
export interface CreateReflectionDto {
    localDate: string;
    prompt: string;
    response?: string;
    completedAt?: string;
}
