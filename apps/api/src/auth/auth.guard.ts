import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header is missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    const decoded = this.authService.verifyToken(token);

    // Upsert the user inside the relational database using the authUserId link
    let user = await this.prisma.user.findUnique({
      where: { authUserId: decoded.sub },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          authUserId: decoded.sub,
          email: decoded.email,
          displayName: decoded.email.split('@')[0],
          timezone: 'UTC',
        },
      });
    }

    // Attach the canonical database user context to the request
    request.user = user;
    return true;
  }
}
