import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';
import { CheckInsService } from './check-ins.service';
import { CheckInDto } from '@streak/validation';

@Controller('habits/:habitId/check-in')
@UseGuards(AuthGuard)
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  checkIn(
    @CurrentUser() user: User,
    @Param('habitId') habitId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.checkInsService.checkIn(user.id, habitId, dto);
  }

  @Delete(':id')
  undoCheckIn(
    @CurrentUser() user: User,
    @Param('habitId') habitId: string,
    @Param('id') id: string,
  ) {
    return this.checkInsService.undoCheckIn(user.id, habitId, id);
  }
}
