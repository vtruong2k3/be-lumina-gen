import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

export interface SeedreamResult {
  data: Array<{ url: string }>;
}

const SEEDREAM_MODELS = [
  'doubao-seedream-5-0-260128',
  'doubao-seedream-4-5-251128',
  'doubao-seedream-4-0-250828',
];

const SEEDREAM_V3_MODELS = ['doubao-seedream-3-0-t2i-250415'];
const SEEDREAM_EDIT_MODELS = ['doubao-seededit-3-0-i2i-250628'];
const SORA_MODELS = ['sora_image'];

export const ALL_SEEDREAM_MODELS = [
  ...SEEDREAM_MODELS,
  ...SEEDREAM_V3_MODELS,
  ...SEEDREAM_EDIT_MODELS,
  ...SORA_MODELS,
];

export interface SeedreamGenerateOptions {
  model: string;
  prompt: string;
  width: number;
  height: number;
  faceMode?: boolean;
  styleImageUrl?: string | null;
  faceImageUrl?: string | null;
}

@Injectable()
export class SeedreamService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('chainhub.baseUrl')!;
    this.apiKey = this.configService.get<string>('chainhub.baseKey')!;
  }

  private toSeedreamSize(width: number, height: number): string {
    if (width >= 2048 || height >= 2048) return '2K';
    return `${width}x${height}`;
  }

  private mapSize(width: number, height: number): string {
    if (height > width) return '1024x1536';
    if (width > height) return '1536x1024';
    return '1024x1024';
  }

  async generate(opts: SeedreamGenerateOptions): Promise<SeedreamResult> {
    const { model, prompt, width, height, faceMode, styleImageUrl, faceImageUrl } = opts;

    const isV3 = SEEDREAM_V3_MODELS.includes(model);
    const isEdit = SEEDREAM_EDIT_MODELS.includes(model);
    const isSora = SORA_MODELS.includes(model);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = { model, prompt };

    if (isSora) {
      payload.n = 1;
      const validSizes = ['1024x1024', '1024x1536', '1536x1024'];
      const requested = `${width}x${height}`;
      payload.size = validSizes.includes(requested) ? requested : this.mapSize(width, height);
      if (styleImageUrl) payload.image = styleImageUrl;
    } else {
      payload.response_format = 'url';
      payload.watermark = isV3;

      if (isEdit) {
        payload.size = 'adaptive';
      } else if (isV3) {
        payload.size = this.mapSize(width, height);
        payload.guidance_scale = 2.5;
        payload.seed = -1;
      } else {
        payload.size = this.toSeedreamSize(width, height);
        payload.output_format = 'png';
      }

      // Build image list: faceMode = face first, style second
      const images: string[] = [];
      if (faceMode) {
        if (faceImageUrl) images.push(faceImageUrl);
        if (styleImageUrl) images.push(styleImageUrl);
      } else {
        if (styleImageUrl) images.push(styleImageUrl);
        if (faceImageUrl) images.push(faceImageUrl);
      }

      if (images.length === 1) payload.image = images[0];
      else if (images.length > 1) payload.image = images;
    }

    // Retry with backoff
    for (let i = 0; i <= 2; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 3000 * i));
      try {
        const res = await firstValueFrom(
          this.httpService.post<SeedreamResult>(this.baseUrl, payload, {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 120_000,
          }),
        );
        return res.data;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status && status !== 500 && status !== 503) throw err;
        if (i === 2) throw err;
      }
    }
    throw new Error('Seedream generation failed after retries');
  }
}

export { FormData };
