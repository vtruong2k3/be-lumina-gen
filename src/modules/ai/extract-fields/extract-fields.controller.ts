import {
  Controller, Post, Body, UseGuards, BadRequestException,
} from '@nestjs/common';
import { OpenAiService } from '../../../external/openai/openai.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ExtractFieldsDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() templatePrompt!: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/extract-fields')
export class ExtractFieldsController {
  constructor(private readonly openAiService: OpenAiService) {}

  @Post()
  @ApiOperation({ summary: 'Extract editable fields from a template prompt' })
  async extractFields(@Body() dto: ExtractFieldsDto) {
    const fields = await this.openAiService.extractFields(dto.templatePrompt);
    if (!fields.length) {
      throw new BadRequestException('Failed to extract fields from template');
    }
    return { fields };
  }
}
