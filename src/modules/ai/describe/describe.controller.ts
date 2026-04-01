import {
  Controller, Post, Body, UseGuards,
} from '@nestjs/common';
import { OpenAiService } from '../../../external/openai/openai.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class DescribeDto {
  @ApiProperty({ example: 'https://images.meigen.ai/...' })
  @IsString() @IsNotEmpty() @IsUrl() imageUrl!: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/describe')
export class DescribeController {
  constructor(private readonly openAiService: OpenAiService) {}

  @Post()
  @ApiOperation({ summary: 'Reverse-engineer an image URL into a detailed prompt (Vision AI)' })
  async describe(@Body() dto: DescribeDto) {
    const description = await this.openAiService.describeImage(dto.imageUrl);
    if (!description) {
      return { error: 'All vision models unavailable', description: '' };
    }
    return { description };
  }
}
