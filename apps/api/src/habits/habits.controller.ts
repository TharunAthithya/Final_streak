import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';
import { HabitsService } from './habits.service';
import { CreateHabitDto } from '@streak/validation';

@Controller('habits')
@UseGuards(AuthGuard)
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Get()
  getHabits(
    @CurrentUser() user: User,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.habitsService.getHabits(user.id, includeArchived === 'true');
  }

  @Post()
  createHabit(@CurrentUser() user: User, @Body() dto: CreateHabitDto) {
    return this.habitsService.createHabit(user.id, dto);
  }

  @Get(':id')
  getHabitById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.habitsService.getHabitById(user.id, id);
  }

  @Patch(':id')
  updateHabit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateHabitDto,
  ) {
    return this.habitsService.updateHabit(user.id, id, dto);
  }

  @Post(':id/archive')
  archiveHabit(@CurrentUser() user: User, @Param('id') id: string) {
    return this.habitsService.archiveHabit(user.id, id);
  }

  @Delete(':id')
  deleteHabit(@CurrentUser() user: User, @Param('id') id: string) {
    return this.habitsService.deleteHabit(user.id, id);
  }
}
