import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';
import { ActivityService } from './activity.service';

@Controller()
@UseGuards(AuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('rooms/:roomId/activity')
  getRoomActivity(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
  ) {
    return this.activityService.getRoomActivity(user.id, roomId);
  }

  @Post('activities/:id/react')
  reactToActivity(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('type') type: string,
  ) {
    return this.activityService.reactToActivity(user.id, id, type);
  }
}
