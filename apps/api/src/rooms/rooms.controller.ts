import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, JoinRoomDto } from '@streak/validation';

@Controller('rooms')
@UseGuards(AuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  getRooms(@CurrentUser() user: User) {
    return this.roomsService.getRooms(user.id);
  }

  @Post()
  createRoom(@CurrentUser() user: User, @Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(user.id, dto);
  }

  @Post('join')
  joinRoom(@CurrentUser() user: User, @Body() dto: JoinRoomDto) {
    return this.roomsService.joinRoom(user.id, dto);
  }

  @Post(':id/leave')
  leaveRoom(@CurrentUser() user: User, @Param('id') id: string) {
    return this.roomsService.leaveRoom(user.id, id);
  }

  @Get(':id')
  getRoomDetails(@CurrentUser() user: User, @Param('id') id: string) {
    return this.roomsService.getRoomDetails(user.id, id);
  }

  // Room habits (accountability targets) management
  @Post(':id/habits')
  createRoomHabit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.roomsService.createRoomHabit(user.id, id, name, description);
  }

  @Post(':id/habits/:roomHabitId/archive')
  archiveRoomHabit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('roomHabitId') roomHabitId: string,
  ) {
    return this.roomsService.archiveRoomHabit(user.id, id, roomHabitId);
  }

  // Explicit opt-in habit linkages
  @Post(':id/habits/:roomHabitId/link')
  linkPersonalHabit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('roomHabitId') roomHabitId: string,
    @Body('personalHabitId') personalHabitId: string,
  ) {
    return this.roomsService.linkPersonalHabit(user.id, id, roomHabitId, personalHabitId);
  }

  @Post(':id/habits/:roomHabitId/unlink')
  unlinkPersonalHabit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('roomHabitId') roomHabitId: string,
  ) {
    return this.roomsService.unlinkPersonalHabit(user.id, id, roomHabitId);
  }
}
