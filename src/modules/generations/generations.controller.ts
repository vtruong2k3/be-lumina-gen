import {
  Controller, Get, Post, Patch, Delete, Body,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { GenerationsService } from './generations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class CreateGenerationDto {
  @ApiProperty() @IsString() @IsNotEmpty() taskId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() prompt!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) width?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) height?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() quality?: string;
}

class UpdateGenerationDto {
  @ApiProperty() @IsString() @IsNotEmpty() taskId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) progress?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) totalTime?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() error?: string;
}

@ApiTags('generations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('generations')
export class GenerationsController {
  constructor(private readonly generationsService: GenerationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get generation history (max 50)' })
  getGenerations(@CurrentUser() user: JwtUser) {
    return this.generationsService.getGenerations(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new generation record' })
  createGeneration(@CurrentUser() user: JwtUser, @Body() dto: CreateGenerationDto) {
    return this.generationsService.createGeneration(user.userId, dto);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update generation status/progress/imageUrl (partial)' })
  updateGeneration(@CurrentUser() user: JwtUser, @Body() dto: UpdateGenerationDto) {
    const { taskId, ...data } = dto;
    return this.generationsService.updateGeneration(user.userId, taskId, data);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all generation history' })
  clearGenerations(@CurrentUser() user: JwtUser) {
    return this.generationsService.clearGenerations(user.userId);
  }
}
