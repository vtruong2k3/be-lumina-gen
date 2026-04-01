import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormDataNode = require('form-data');

export interface ChainHubTaskResponse {
  task_id: string;
  status: string;
}

export interface ChainHubPollResponse {
  task_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  result?: {
    images?: Array<{ url: string }>;
  };
  error?: string;
}

export interface ChainHubGenerateOptions {
  prompt: string;
  width: number;
  height: number;
  quality?: string;
  orientation?: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  imageBuffer2?: Buffer;
  imageMimeType2?: string;
}

@Injectable()
export class ChainhubService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('chainhub.legacyUrl')!;
    this.apiKey = this.configService.get<string>('chainhub.legacyKey')!;
  }

  async createTask(opts: ChainHubGenerateOptions): Promise<ChainHubTaskResponse> {
    const form = new FormDataNode();
    form.append('prompt', opts.prompt);
    form.append('width', opts.width.toString());
    form.append('height', opts.height.toString());
    form.append('quality', opts.quality || 'sd');
    form.append('orientation', opts.orientation || 'portrait');

    if (opts.imageBuffer) {
      form.append('image', opts.imageBuffer, {
        filename: 'image.jpg',
        contentType: opts.imageMimeType || 'image/jpeg',
      });
    }
    if (opts.imageBuffer2) {
      form.append('image_2', opts.imageBuffer2, {
        filename: 'image_2.jpg',
        contentType: opts.imageMimeType2 || 'image/jpeg',
      });
    }

    const res = await firstValueFrom(
      this.httpService.post<ChainHubTaskResponse>(this.apiUrl, form, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...form.getHeaders(),
        },
        timeout: 30_000,
      }),
    );

    return res.data;
  }

  async pollTask(taskId: string): Promise<ChainHubPollResponse> {
    const res = await firstValueFrom(
      this.httpService.get<ChainHubPollResponse>(
        `${this.apiUrl}/${taskId}`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 15_000,
        },
      ),
    );
    return res.data;
  }
}
