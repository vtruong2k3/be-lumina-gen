import {
  Controller, Post, Body, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OpenAiService } from '../../../external/openai/openai.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class EnhanceDto {
  @ApiProperty({ example: 'a girl in a coffee shop' })
  @IsString() @IsNotEmpty() prompt!: string;

  @ApiPropertyOptional({ enum: ['realistic', 'anime', 'illustration'] })
  @IsOptional() @IsIn(['realistic', 'anime', 'illustration']) style?: 'realistic' | 'anime' | 'illustration';
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/enhance')
export class EnhanceController {
  constructor(private readonly openAiService: OpenAiService) {}

  // Strict rate limit: max 10 prompt enhancements per minute per IP
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post()
  @ApiOperation({ summary: 'Enhance a simple prompt using GPT-4o (3 styles)' })
  async enhance(@Body() dto: EnhanceDto) {
    const enhanced = await this.openAiService.enhancePrompt(dto.prompt, dto.style || 'realistic');
    if (!enhanced) {
      return { error: 'Enhancement failed', enhanced: '' };
    }
    return { enhanced };
  }
}
