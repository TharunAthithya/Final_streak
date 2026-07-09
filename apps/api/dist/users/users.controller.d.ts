import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserDto } from '@streak/validation';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(user: User): {
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
    updateMe(user: User, dto: UpdateUserDto): Promise<{
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
    }>;
    deleteMe(user: User): Promise<{
        success: boolean;
    }>;
}
