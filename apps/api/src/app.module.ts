import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HabitsModule } from './habits/habits.module';
import { CheckInsModule } from './check-ins/check-ins.module';
import { RoomsModule } from './rooms/rooms.module';
import { ActivityModule } from './activity/activity.module';
import { LeaderboardsModule } from './leaderboards/leaderboards.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    HabitsModule,
    CheckInsModule,
    RoomsModule,
    ActivityModule,
    LeaderboardsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
