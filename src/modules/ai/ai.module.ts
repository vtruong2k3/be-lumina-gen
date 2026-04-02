import { Module } from '@nestjs/common';
import { ExternalModule } from '../../external/external.module';
import { GenerateController } from './generate/generate.controller';
import { GenerateService } from './generate/generate.service';
import { EnhanceController } from './enhance/enhance.controller';
import { DescribeController } from './describe/describe.controller';
import { AnalyzeProductController } from './analyze-product/analyze-product.controller';
import { ExtractFieldsController } from './extract-fields/extract-fields.controller';

@Module({
  imports: [ExternalModule],
  controllers: [
    GenerateController,
    EnhanceController,
    DescribeController,
    AnalyzeProductController,
    ExtractFieldsController,
  ],
  providers: [GenerateService],
})
export class AiModule {}

