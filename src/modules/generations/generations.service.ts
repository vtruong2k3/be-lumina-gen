import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_GENERATIONS = 50;

@Injectable()
export class GenerationsService {
  constructor(private prisma: PrismaService) {}

  async getGenerations(userId: string) {
    return this.prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: MAX_GENERATIONS,
    });
  }

  async createGeneration(
    userId: string,
    data: { taskId: string; prompt: string; width?: number; height?: number; quality?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const generation = await tx.generation.create({
        data: {
          userId,
          taskId: data.taskId,
          prompt: data.prompt,
          width: data.width || 1024,
          height: data.height || 1536,
          quality: data.quality || 'sd',
        },
      });

      // Auto-trim: keep only MAX_GENERATIONS most recent (safe inside transaction)
      const count = await tx.generation.count({ where: { userId } });
      if (count > MAX_GENERATIONS) {
        const oldest = await tx.generation.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          take: count - MAX_GENERATIONS,
          select: { id: true },
        });
        await tx.generation.deleteMany({
          where: { id: { in: oldest.map((g) => g.id) } },
        });
      }

      return generation;
    });
  }

  async updateGeneration(
    userId: string,
    taskId: string,
    data: {
      status?: string;
      progress?: number;
      imageUrl?: string;
      totalTime?: number;
      error?: string;
    },
  ) {
    // Only update fields that were explicitly provided
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.totalTime !== undefined) updateData.totalTime = data.totalTime;
    if (data.error !== undefined) updateData.error = data.error;

    const result = await this.prisma.generation.updateMany({
      where: { taskId, userId },
      data: updateData,
    });

    return { updated: result.count };
  }

  async clearGenerations(userId: string) {
    await this.prisma.generation.deleteMany({ where: { userId } });
    return { ok: true };
  }
}
