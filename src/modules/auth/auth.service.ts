import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import type { GoogleProfile } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ── Email/Password Auth ──────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createUser({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
      // Re-fetch user from DB to get fresh name/image for new token
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── Google OAuth ─────────────────────────────────────────────────

  async loginWithGoogle(googleProfile: GoogleProfile) {
    if (!googleProfile.email) {
      throw new UnauthorizedException('No email provided by Google');
    }

    const user = await this.usersService.findOrCreateByGoogle({
      email: googleProfile.email,
      name: googleProfile.name,
      picture: googleProfile.picture,
    });

    return this.generateTokens(user);
  }

  // ── Token Generation ─────────────────────────────────────────────

  generateTokens(user: { id: string; email: string; name?: string | null; image?: string | null }) {
    // Access token: embed profile so FE can decode without extra API call
    const accessPayload = {
      sub: user.id,
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
    };

    // Refresh token: minimal payload (only sub needed for rotation)
    const refreshPayload = { sub: user.id };

    const access_token = this.jwtService.sign(accessPayload);
    const refresh_token = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret') as string,
      expiresIn: '7d' as const,
    });

    return { access_token, refresh_token };
  }
}
