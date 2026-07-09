import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from '@streak/validation';
import { User } from '@prisma/client';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    updateProfile(userId: string, dto: UpdateUserDto): Promise<User>;
    deleteAccount(userId: string): Promise<{
        success: boolean;
    }>;
}
