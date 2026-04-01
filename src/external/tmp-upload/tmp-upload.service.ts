import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormDataNode = require('form-data');

const TMP_FILES_URL = 'https://tmpfiles.org/api/v1/upload';

@Injectable()
export class TmpUploadService {
  private readonly logger = new Logger(TmpUploadService.name);

  constructor(private httpService: HttpService) {}

  /**
   * Upload a file buffer to tmpfiles.org and return a direct download URL.
   * Falls back to base64 data URI if upload fails.
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    try {
      const form = new FormDataNode();
      form.append('file', buffer, { filename, contentType: mimeType });

      const res = await firstValueFrom(
        this.httpService.post<{ data?: { url?: string } }>(TMP_FILES_URL, form, {
          headers: form.getHeaders(),
          timeout: 30_000,
        }),
      );

      const pageUrl = res.data?.data?.url;
      if (!pageUrl) throw new Error('No URL from tmpfiles.org');

      // Convert page URL to direct download URL
      const directUrl = pageUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      this.logger.log(
        `Uploaded to temp URL: ${directUrl} (${(buffer.length / 1024).toFixed(0)} KB)`,
      );
      return directUrl;
    } catch (err) {
      this.logger.warn(
        `tmpfiles.org upload failed, falling back to base64: ${(err as Error).message}`,
      );
      return this.toBase64DataUri(buffer, mimeType);
    }
  }

  toBase64DataUri(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}
