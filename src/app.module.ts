import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { HistoryModule } from './modules/history/history.module';
import { GenerationsModule } from './modules/generations/generations.module';
import { AiModule } from './modules/ai/ai.module';
import { TrendingModule } from './modules/trending/trending.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FavoritesModule,
    HistoryModule,
    GenerationsModule,
    AiModule,
    TrendingModule,
  ],
})
export class AppModule {}
