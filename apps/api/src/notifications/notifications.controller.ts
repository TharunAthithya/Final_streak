import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('devices')
  registerDevice(
    @CurrentUser() user: User,
    @Body('platform') platform: string,
    @Body('pushToken') pushToken: string,
  ) {
    return this.notificationsService.registerDevice(user.id, platform, pushToken);
  }
}
