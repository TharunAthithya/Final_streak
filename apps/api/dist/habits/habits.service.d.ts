import { PrismaService } from '../prisma/prisma.service';
import { CreateHabitDto } from '@streak/validation';
import { Habit } from '@prisma/client';
export declare class HabitsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createHabit(userId: string, dto: CreateHabitDto): Promise<Habit>;
    getHabits(userId: string, includeArchived?: boolean): Promise<any[]>;
    getHabitById(userId: string, habitId: string): Promise<any>;
    updateHabit(userId: string, habitId: string, dto: CreateHabitDto): Promise<Habit>;
    archiveHabit(userId: string, habitId: string): Promise<Habit>;
    deleteHabit(userId: string, habitId: string): Promise<{
        success: boolean;
    }>;
}
