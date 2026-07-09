import { HabitStatus, ScheduleType, RoomVisibility } from '@streak/contracts';
export declare const mockUser: {
    id: string;
    email: string;
    displayName: string;
    username: string;
    timezone: string;
    xp: number;
    level: number;
    createdAt: string;
};
export declare const mockHabit: {
    id: string;
    userId: string;
    name: string;
    description: string;
    icon: string;
    status: HabitStatus;
    scheduleType: ScheduleType;
    timezone: string;
    startDate: string;
    createdAt: string;
};
export declare const mockRoom: {
    id: string;
    ownerId: string;
    name: string;
    description: string;
    visibility: RoomVisibility;
    inviteCode: string;
    memberCount: number;
    activeTodayCount: number;
};
