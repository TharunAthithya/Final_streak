import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HabitsModule } from './habits/habits.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, HabitsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
