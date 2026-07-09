import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthGuard implements CanActivate {
    private readonly authService;
    private readonly prisma;
    constructor(authService: AuthService, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
