import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import type { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from '../../common/guards/google-auth.guard';
import type { GoogleProfile } from './strategies/google.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ── Email / Password ─────────────────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with email & password' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto);
    this.setRefreshCookie(res, tokens.refresh_token);
    return { access_token: tokens.access_token };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login with email & password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    this.setRefreshCookie(res, tokens.refresh_token);
    return { access_token: tokens.access_token };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token via HttpOnly cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;
    if (!refreshToken) throw new UnauthorizedException('No refresh token');

    const tokens = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, tokens.refresh_token);
    return { access_token: tokens.access_token };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Logout — clears HttpOnly cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  // ── Google OAuth ─────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google OAuth consent screen' })
  googleLogin() {
    // Passport handles the redirect automatically — this method body is never reached.
  }

  @Get('callback/google')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint() // Hide from Swagger (browser redirect endpoint)
  async googleCallback(
    @Req() req: Request & { user: GoogleProfile },
    @Res() res: Response,
  ) {
    const tokens = await this.authService.loginWithGoogle(req.user);

    // Set HttpOnly refresh token cookie
    this.setRefreshCookie(res, tokens.refresh_token);

    // Redirect frontend with access_token as query param
    // Frontend should read and store it in memory (never localStorage)
    const frontendUrl = this.configService.get<string>('frontend.url');
    const redirectUrl = `${frontendUrl}/auth/callback?access_token=${tokens.access_token}`;
    res.redirect(redirectUrl);
  }

  // ── Cookie helper ─────────────────────────────────────────────────

  private setRefreshCookie(res: Response, token: string) {
    const isProduction =
      this.configService.get<string>('nodeEnv') === 'production';
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax', // 'lax' required for Google OAuth redirect (cross-site)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });
  }
}
