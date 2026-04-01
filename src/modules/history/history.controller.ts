import {
  Controller, Get, Post, Delete, Body,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class AddHistoryDto {
  @ApiProperty({ example: 'prompt_123' })
  @IsString()
  @IsNotEmpty()
  promptId!: string;
}

@ApiTags('history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get view history (max 100)' })
  getHistory(@CurrentUser() user: JwtUser) {
    return this.historyService.getHistory(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Track a prompt view (upsert)' })
  addHistory(@CurrentUser() user: JwtUser, @Body() dto: AddHistoryDto) {
    return this.historyService.addHistory(user.userId, dto.promptId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all view history' })
  clearHistory(@CurrentUser() user: JwtUser) {
    return this.historyService.clearHistory(user.userId);
  }
}
