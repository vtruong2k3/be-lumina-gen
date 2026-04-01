import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * GoogleAuthGuard
 * Triggers Google OAuth flow — redirects user to Google consent screen.
 * Usage: @UseGuards(GoogleAuthGuard) on the /auth/google route.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
