import { User } from '@prisma/client';
import { HabitsService } from './habits.service';
import { CreateHabitDto } from '@streak/validation';
export declare class HabitsController {
    private readonly habitsService;
    constructor(habitsService: HabitsService);
    getHabits(user: User, includeArchived?: string): Promise<any[]>;
    createHabit(user: User, dto: CreateHabitDto): Promise<{
        name: string;
        id: string;
        timezone: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        archivedAt: Date | null;
        userId: string;
        icon: string | null;
        status: import("@prisma/client").$Enums.HabitStatus;
        scheduleType: import("@prisma/client").$Enums.ScheduleType;
        targetPerWeek: number | null;
        startDate: Date;
    }>;
    getHabitById(user: User, id: string): Promise<any>;
    updateHabit(user: User, id: string, dto: CreateHabitDto): Promise<{
        name: string;
        id: string;
        timezone: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        archivedAt: Date | null;
        userId: string;
        icon: string | null;
        status: import("@prisma/client").$Enums.HabitStatus;
        scheduleType: import("@prisma/client").$Enums.ScheduleType;
        targetPerWeek: number | null;
        startDate: Date;
    }>;
    archiveHabit(user: User, id: string): Promise<{
        name: string;
        id: string;
        timezone: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        archivedAt: Date | null;
        userId: string;
        icon: string | null;
        status: import("@prisma/client").$Enums.HabitStatus;
        scheduleType: import("@prisma/client").$Enums.ScheduleType;
        targetPerWeek: number | null;
        startDate: Date;
    }>;
    deleteHabit(user: User, id: string): Promise<{
        success: boolean;
    }>;
}
