import {
  Controller, Get, Post, Delete, Body, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/favorite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all favorites for current user' })
  getFavorites(@CurrentUser() user: JwtUser) {
    return this.favoritesService.getFavorites(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a prompt to favorites (upsert)' })
  addFavorite(@CurrentUser() user: JwtUser, @Body() dto: CreateFavoriteDto) {
    return this.favoritesService.addFavorite(user.userId, dto.promptId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a prompt from favorites' })
  @ApiQuery({ name: 'promptId', required: true })
  removeFavorite(
    @CurrentUser() user: JwtUser,
    @Query('promptId') promptId: string,
  ) {
    return this.favoritesService.removeFavorite(user.userId, promptId);
  }
}
