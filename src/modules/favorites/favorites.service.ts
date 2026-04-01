import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async getFavorites(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
      select: { promptId: true, addedAt: true },
    });
  }

  async addFavorite(userId: string, promptId: string) {
    return this.prisma.favorite.upsert({
      where: { userId_promptId: { userId, promptId } },
      update: { addedAt: new Date() },
      create: { userId, promptId },
    });
  }

  async removeFavorite(userId: string, promptId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId, promptId },
    });
    return { ok: true };
  }
}
