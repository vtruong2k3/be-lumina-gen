import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('google.clientId') || 'PLACEHOLDER';
    const clientSecret = configService.get<string>('google.clientSecret') || 'PLACEHOLDER';
    const callbackURL = configService.get<string>('google.callbackUrl')!;

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });

    if (!clientID || clientID === 'PLACEHOLDER') {
      this.logger.warn(
        '⚠️  GOOGLE_CLIENT_ID not configured — Google OAuth will not work. ' +
        'Get credentials at: https://console.cloud.google.com/',
      );
    }
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { id, displayName, emails, photos } = profile;

    const googleProfile: GoogleProfile = {
      googleId: id,
      email: emails?.[0]?.value || '',
      name: displayName || '',
      picture: photos?.[0]?.value || '',
    };

    done(null, googleProfile);
  }
}
