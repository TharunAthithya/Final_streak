import { z } from 'zod';
export const UpdateUserSchema = z.object({
    displayName: z.string().min(2, 'Name must be at least 2 characters').max(50),
    username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores').optional(),
    timezone: z.string().min(1, 'Timezone is required'),
    bio: z.string().max(200, 'Bio must be 200 characters or less').optional(),
    avatarPath: z.string().optional(),
});
export const CreateHabitSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(300).optional(),
    icon: z.string().max(50).optional(),
    scheduleType: z.enum(['DAILY', 'SPECIFIC_DAYS', 'FLEXIBLE']),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    targetPerWeek: z.number().int().min(1).max(7).optional(),
    timezone: z.string().min(1, 'Timezone is required'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Reminder time must be in HH:MM format').nullable().optional(),
});
export const CheckInSchema = z.object({
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Local date must be in YYYY-MM-DD format'),
    timezoneAtCompletion: z.string().min(1, 'Timezone is required'),
    idempotencyKey: z.string().min(1, 'Idempotency key is required'),
});
export const CreateRoomSchema = z.object({
    name: z.string().min(3, 'Room name must be at least 3 characters').max(50),
    description: z.string().max(200).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']),
    durationType: z.enum(['7_DAYS', '14_DAYS', '30_DAYS', '60_DAYS', 'CUSTOM', 'PERMANENT']).optional(),
    durationDays: z.number().int().min(1).max(365).optional(),
    trackedHabits: z.array(z.any()).optional(),
    invitedUserIds: z.array(z.string()).optional(),
});
export const JoinRoomSchema = z.object({
    inviteCode: z.string().min(1, 'Invite code is required'),
});
