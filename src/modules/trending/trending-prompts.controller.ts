import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TrendingPromptsService } from './trending-prompts.service';

@ApiTags('trending')
@Controller('trending')
export class TrendingPromptsController {
  constructor(private readonly trendingService: TrendingPromptsService) {}

  /**
   * GET /api/trending
   * Paginated list of trending prompts with optional filters
   */
  @Get()
  @ApiOperation({
    summary: 'Get trending prompts (paginated, filterable)',
    description:
      'Returns trending AI prompts from the community. Supports filtering by category, model, and full-text search.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'category', required: false, type: String, example: 'Girl' })
  @ApiQuery({ name: 'model', required: false, type: String, example: 'nanobanana' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['likes', 'views', 'rank', 'date'],
    example: 'rank',
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'], example: 'asc' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('category') category?: string,
    @Query('model') model?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'likes' | 'views' | 'rank' | 'date',
    @Query('order') order?: 'asc' | 'desc',
  ) {
    // Clamp limit to max 100
    const safeLimit = Math.min(limit, 100);
    return this.trendingService.findAll({
      page,
      limit: safeLimit,
      category,
      model,
      search,
      sortBy,
      order,
    });
  }

  /**
   * GET /api/trending/meta
   * Returns available categories and models for frontend filters
   */
  @Get('meta')
  @ApiOperation({ summary: 'Get available categories and models for filtering' })
  getMeta() {
    return {
      categories: this.trendingService.getCategories(),
      models: this.trendingService.getModels(),
    };
  }

  /**
   * GET /api/trending/:id
   * Get a single prompt by its post ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single trending prompt by ID' })
  findOne(@Param('id') id: string) {
    return this.trendingService.findById(id);
  }

  /**
   * GET /api/trending/author/:author
   * Get prompts from a specific author
   */
  @Get('author/:author')
  @ApiOperation({ summary: 'Get prompts from a specific author' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  findByAuthor(
    @Param('author') author: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return {
      data: this.trendingService.findByAuthor(author, limit),
    };
  }
}
