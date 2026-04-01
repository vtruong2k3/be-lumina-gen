import { Module } from '@nestjs/common';
import { GenerationsService } from './generations.service';
import { GenerationsController } from './generations.controller';

@Module({
  controllers: [GenerationsController],
  providers: [GenerationsService],
})
export class GenerationsModule {}
