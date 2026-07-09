import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';
import { LeaderboardsService } from './leaderboards.service';

@Controller('rooms/:id/leaderboard')
@UseGuards(AuthGuard)
export class LeaderboardsController {
  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  @Get()
  getRoomLeaderboard(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('period') period?: 'weekly' | 'monthly',
  ) {
    return this.leaderboardsService.getRoomLeaderboard(user.id, id, period || 'weekly');
  }
}
