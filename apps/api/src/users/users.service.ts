import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from '@streak/validation';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        username: dto.username,
        timezone: dto.timezone,
        bio: dto.bio,
        avatarPath: dto.avatarPath,
      },
    });
  }
}
