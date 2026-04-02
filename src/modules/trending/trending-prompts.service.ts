import { Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

export interface TrendingPrompt {
  rank: number;
  id: string;
  prompt: string;
  author: string;
  author_name: string;
  likes: number;
  views: number;
  image: string;
  images: string[];
  model: string;
  categories: string[];
  date: string;
  source_url: string;
}

export interface TrendingPromptsResult {
  data: TrendingPrompt[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    categories: string[];
  };
}

@Injectable()
export class TrendingPromptsService {
  private readonly prompts: TrendingPrompt[];
  private readonly allCategories: string[];

  constructor() {
    const filePath = path.join(process.cwd(), 'data', 'trending-prompts.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    this.prompts = JSON.parse(raw) as TrendingPrompt[];

    // Extract unique categories
    const catSet = new Set<string>();
    this.prompts.forEach((p) => p.categories.forEach((c) => catSet.add(c)));
    this.allCategories = Array.from(catSet).sort();
  }

  findAll(opts: {
    page: number;
    limit: number;
    category?: string;
    model?: string;
    search?: string;
    sortBy?: 'likes' | 'views' | 'rank' | 'date';
    order?: 'asc' | 'desc';
  }): TrendingPromptsResult {
    let items = [...this.prompts];

    // Filter by category
    if (opts.category) {
      items = items.filter((p) =>
        p.categories.some(
          (c) => c.toLowerCase() === opts.category!.toLowerCase(),
        ),
      );
    }

    // Filter by model
    if (opts.model) {
      items = items.filter(
        (p) => p.model.toLowerCase() === opts.model!.toLowerCase(),
      );
    }

    // Search in prompt text, author, author_name
    if (opts.search) {
      const q = opts.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.prompt.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.author_name.toLowerCase().includes(q),
      );
    }

    // Sort
    const sortBy = opts.sortBy || 'rank';
    const order = opts.order || 'asc';
    items.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortBy === 'date') {
        aVal = a.date;
        bVal = b.date;
      } else {
        aVal = a[sortBy];
        bVal = b[sortBy];
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return order === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    const total = items.length;
    const totalPages = Math.ceil(total / opts.limit);
    const start = (opts.page - 1) * opts.limit;
    const data = items.slice(start, start + opts.limit);

    return {
      data,
      meta: {
        total,
        page: opts.page,
        limit: opts.limit,
        totalPages,
        categories: this.allCategories,
      },
    };
  }

  findById(id: string): TrendingPrompt {
    const item = this.prompts.find((p) => p.id === id);
    if (!item) throw new NotFoundException(`Prompt with id "${id}" not found`);
    return item;
  }

  findByIds(ids: string[]): TrendingPrompt[] {
    if (!ids || ids.length === 0) return [];
    return this.prompts.filter((p) => ids.includes(p.id));
  }

  findByAuthor(author: string, limit = 10): TrendingPrompt[] {
    return this.prompts
      .filter((p) => p.author.toLowerCase() === author.toLowerCase())
      .slice(0, limit);
  }

  getCategories(): string[] {
    return this.allCategories;
  }

  getModels(): string[] {
    const models = new Set<string>();
    this.prompts.forEach((p) => models.add(p.model));
    return Array.from(models).sort();
  }
}
