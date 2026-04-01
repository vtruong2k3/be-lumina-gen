import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenAiService } from './openai/openai.service';
import { SeedreamService } from './seedream/seedream.service';
import { ChainhubService } from './chainhub/chainhub.service';
import { TmpUploadService } from './tmp-upload/tmp-upload.service';

@Module({
  imports: [HttpModule],
  providers: [OpenAiService, SeedreamService, ChainhubService, TmpUploadService],
  exports: [OpenAiService, SeedreamService, ChainhubService, TmpUploadService],
})
export class ExternalModule {}
