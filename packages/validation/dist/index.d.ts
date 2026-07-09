import { z } from 'zod';
export declare const UpdateUserSchema: z.ZodObject<{
    displayName: z.ZodString;
    username: z.ZodOptional<z.ZodString>;
    timezone: z.ZodString;
    bio: z.ZodOptional<z.ZodString>;
    avatarPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    displayName: string;
    timezone: string;
    username?: string | undefined;
    bio?: string | undefined;
    avatarPath?: string | undefined;
}, {
    displayName: string;
    timezone: string;
    username?: string | undefined;
    bio?: string | undefined;
    avatarPath?: string | undefined;
}>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export declare const CreateHabitSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    scheduleType: z.ZodEnum<["DAILY", "SPECIFIC_DAYS", "FLEXIBLE"]>;
    daysOfWeek: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    targetPerWeek: z.ZodOptional<z.ZodNumber>;
    timezone: z.ZodString;
    startDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timezone: string;
    name: string;
    scheduleType: "DAILY" | "SPECIFIC_DAYS" | "FLEXIBLE";
    startDate: string;
    description?: string | undefined;
    icon?: string | undefined;
    daysOfWeek?: number[] | undefined;
    targetPerWeek?: number | undefined;
}, {
    timezone: string;
    name: string;
    scheduleType: "DAILY" | "SPECIFIC_DAYS" | "FLEXIBLE";
    startDate: string;
    description?: string | undefined;
    icon?: string | undefined;
    daysOfWeek?: number[] | undefined;
    targetPerWeek?: number | undefined;
}>;
export type CreateHabitDto = z.infer<typeof CreateHabitSchema>;
export declare const CheckInSchema: z.ZodObject<{
    localDate: z.ZodString;
    timezoneAtCompletion: z.ZodString;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    localDate: string;
    timezoneAtCompletion: string;
    idempotencyKey: string;
}, {
    localDate: string;
    timezoneAtCompletion: string;
    idempotencyKey: string;
}>;
export type CheckInDto = z.infer<typeof CheckInSchema>;
export declare const CreateRoomSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    visibility: z.ZodEnum<["PUBLIC", "PRIVATE"]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    visibility: "PUBLIC" | "PRIVATE";
    description?: string | undefined;
}, {
    name: string;
    visibility: "PUBLIC" | "PRIVATE";
    description?: string | undefined;
}>;
export type CreateRoomDto = z.infer<typeof CreateRoomSchema>;
export declare const JoinRoomSchema: z.ZodObject<{
    inviteCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    inviteCode: string;
}, {
    inviteCode: string;
}>;
export type JoinRoomDto = z.infer<typeof JoinRoomSchema>;
