import { Module } from '@nestjs/common';
import { TrendingPromptsService } from './trending-prompts.service';
import { TrendingPromptsController } from './trending-prompts.controller';

@Module({
  controllers: [TrendingPromptsController],
  providers: [TrendingPromptsService],
  exports: [TrendingPromptsService],
})
export class TrendingModule {}
