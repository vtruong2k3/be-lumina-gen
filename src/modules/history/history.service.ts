import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_HISTORY = 100;

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async getHistory(userId: string) {
    return this.prisma.viewHistory.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: MAX_HISTORY,
      select: { promptId: true, viewedAt: true },
    });
  }

  async addHistory(userId: string, promptId: string) {
    const item = await this.prisma.viewHistory.upsert({
      where: { userId_promptId: { userId, promptId } },
      update: { viewedAt: new Date() },
      create: { userId, promptId },
    });

    // Auto-trim: keep only MAX_HISTORY most recent
    const count = await this.prisma.viewHistory.count({ where: { userId } });
    if (count > MAX_HISTORY) {
      const oldest = await this.prisma.viewHistory.findMany({
        where: { userId },
        orderBy: { viewedAt: 'asc' },
        take: count - MAX_HISTORY,
        select: { id: true },
      });
      await this.prisma.viewHistory.deleteMany({
        where: { id: { in: oldest.map((h) => h.id) } },
      });
    }

    return item;
  }

  async clearHistory(userId: string) {
    await this.prisma.viewHistory.deleteMany({ where: { userId } });
    return { ok: true };
  }
}
