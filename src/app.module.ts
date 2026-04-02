import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
    // Global Rate Limiting: 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds (ms)
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    FavoritesModule,
    HistoryModule,
    GenerationsModule,
    AiModule,
    TrendingModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally across all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
