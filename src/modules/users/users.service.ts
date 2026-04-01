import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: {
    email: string;
    name: string;
    password: string;
  }) {
    return this.prisma.user.create({ data });
  }

  /**
   * Google OAuth: find existing user by email or create a new one.
   * Google users have no password (null).
   */
  async findOrCreateByGoogle(profile: {
    email: string;
    name: string;
    picture: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existing) {
      // Update profile picture if changed
      if (existing.image !== profile.picture) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: {
            image: profile.picture,
            emailVerified: existing.emailVerified ?? new Date(),
          },
        });
      }
      return existing;
    }

    // New user via Google — no password
    return this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        image: profile.picture,
        emailVerified: new Date(), // Google emails are pre-verified
        password: null,
      },
    });
  }
}
