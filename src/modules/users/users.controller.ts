import {
  Controller,
  Get,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/users/me
   * Returns the authenticated user's profile from the database.
   * Use this to render Avatar, Name, and future fields like credits/plan.
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser() jwtUser: JwtUser) {
    const user = await this.usersService.findById(jwtUser.userId);
    if (!user) throw new NotFoundException('User not found');

    // Never expose hashed password to the client
    const { password: _pw, ...profile } = user;
    return profile;
  }
}
