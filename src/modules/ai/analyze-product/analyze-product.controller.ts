import {
  Controller, Post, Body, UseGuards, BadRequestException,
} from '@nestjs/common';
import { OpenAiService, ProductAnalysis } from '../../../external/openai/openai.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class AnalyzeProductDto {
  @ApiPropertyOptional({ description: 'URL of product/food image (Mode 1 & 2)' })
  @IsOptional() @IsString() @IsUrl() imageUrl?: string;

  @ApiPropertyOptional({ description: 'Template prompt to adapt (Mode 2 & 3)' })
  @IsOptional() @IsString() templatePrompt?: string;

  @ApiPropertyOptional({ description: 'Manual field overrides (Mode 3)' })
  @IsOptional() @IsObject() manualFields?: Record<string, string>;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/analyze-product')
export class AnalyzeProductController {
  constructor(private readonly openAiService: OpenAiService) {}

  @Post()
  @ApiOperation({
    summary: 'Analyze product image and optionally adapt a template prompt',
    description: 'Mode 1: imageUrl only → returns analysis. Mode 2: imageUrl + templatePrompt → returns analysis + adaptedPrompt. Mode 3: manualFields + templatePrompt → returns adaptedPrompt.',
  })
  async analyzeProduct(@Body() dto: AnalyzeProductDto) {
    const { imageUrl, templatePrompt, manualFields } = dto;

    // ── Mode 3: Manual field edit ──
    if (manualFields && templatePrompt) {
      const adaptedPrompt = await this.openAiService.replaceWithManualFields(manualFields, templatePrompt);
      if (!adaptedPrompt) {
        throw new BadRequestException('Prompt adaptation failed');
      }
      const analysis: ProductAnalysis = {
        name: manualFields['product_name'] || 'Custom Product',
        category: 'dish',
        cuisine: manualFields['cuisine'],
        ingredients: manualFields['ingredients']?.split(',').map((s) => s.trim()).filter(Boolean) || [],
        colors: manualFields['colors']?.split(',').map((s) => s.trim()).filter(Boolean) || [],
        brand: manualFields['brand'],
        description: 'Manually edited from template',
      };
      return { analysis, adaptedPrompt };
    }

    // ── Mode 1 & 2: Vision-based ──
    if (!imageUrl) {
      throw new BadRequestException('imageUrl is required for Mode 1 and 2');
    }

    const analysis = await this.openAiService.analyzeProduct(imageUrl);
    if (!analysis) {
      throw new BadRequestException('Vision analysis failed');
    }

    if (!templatePrompt) {
      return { analysis };
    }

    // Mode 2: also adapt template
    const adaptedPrompt = await this.openAiService.replaceProductInTemplate(analysis, templatePrompt);
    return { analysis, adaptedPrompt: adaptedPrompt ?? null };
  }
}
