import { Injectable, Logger } from '@nestjs/common';
import { SeedreamService, ALL_SEEDREAM_MODELS } from '../../../external/seedream/seedream.service';
import { ChainhubService } from '../../../external/chainhub/chainhub.service';
import { TmpUploadService } from '../../../external/tmp-upload/tmp-upload.service';

// ── Face-lock Prompt Template ────────────────────────────────────────────────
// Injected when @face mode is activated. Forces the AI to strictly preserve
// the target person's facial structure (bones, eye shape, lip form, skin tone).
const FACE_LOCK_PREFIX =
  '[参考图1为目标人物照片，必须严格还原其身份特征]\n' +
  '高度保持参考图1中人物的面部特征：面部骨骼结构、眼型、鼻梁高低、唇形、' +
  '肤色、肤质纹理、脸型宽窄均不可改变，生成图中人物必须与参考图1为同一人物，' +
  '绝对不能更换人脸。\n场景描述：';

// Model automatically forced when @face mode is active (supports multi-ref)
const FACE_LOCK_MODEL = 'doubao-seedream-5-0-260128';

export interface GeneratePayload {
  prompt: string;
  model: string;
  width: number;
  height: number;
  quality: string;
  orientation: string;
  faceMode: boolean;
  styleFile?: Express.Multer.File;
  faceFile?: Express.Multer.File;
  refImageUrl?: string;
}

export interface GenerateResult {
  // Seedream sync: contains image URLs immediately
  data?: Array<{ url: string }>;
  // ChainHub async: only task_id + initial status
  task_id?: string;
  status?: string;
}

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);

  constructor(
    private readonly seedreamService: SeedreamService,
    private readonly chainhubService: ChainhubService,
    private readonly tmpUploadService: TmpUploadService,
  ) {}

  async generate(payload: GeneratePayload): Promise<GenerateResult> {
    let { prompt, model } = payload;
    const { width, height, quality, orientation, faceMode, styleFile, faceFile, refImageUrl } = payload;

    // ── @face mode: inject strict face-lock prompt + force Seedream 5.0 ────
    const hasFaceRef = !!(faceFile || refImageUrl);
    if (faceMode && hasFaceRef) {
      // Strip the "@face" trigger word from user's prompt
      prompt = prompt.replace(/@face\b/gi, '').trim();
      // Prepend the Chinese face-lock constraint block
      prompt = `${FACE_LOCK_PREFIX}${prompt}`;

      // Enforce the only model capable of strict face preservation
      if (!model?.includes('seedream-5')) {
        model = FACE_LOCK_MODEL;
      }
      this.logger.log(`[@face] Activated — model forced to: ${model}`);
    }

    // ── Route: Seedream / Sora (synchronous — returns images immediately) ───
    if (model && ALL_SEEDREAM_MODELS.includes(model)) {
      return this.handleSeedream({ model, prompt, width, height, faceMode, styleFile, faceFile, refImageUrl });
    }

    // ── Route: ChainHub legacy (asynchronous — returns task_id for polling) ─
    return this.handleChainhub({ prompt, width, height, quality, orientation, styleFile, faceFile });
  }

  // ── Private: Seedream sync pipeline ─────────────────────────────────────

  private async handleSeedream(opts: {
    model: string;
    prompt: string;
    width: number;
    height: number;
    faceMode: boolean;
    styleFile?: Express.Multer.File;
    faceFile?: Express.Multer.File;
    refImageUrl?: string;
  }): Promise<GenerateResult> {
    const { model, prompt, width, height, faceMode, styleFile, faceFile, refImageUrl } = opts;

    // Upload temp files to get public URLs for the Seedream API
    let styleImageUrl: string | null = null;
    let faceImageUrl: string | null = refImageUrl || null;

    if (styleFile) {
      styleImageUrl = await this.tmpUploadService.uploadBuffer(
        styleFile.buffer,
        styleFile.originalname,
        styleFile.mimetype,
      );
    }
    if (faceFile) {
      faceImageUrl = await this.tmpUploadService.uploadBuffer(
        faceFile.buffer,
        faceFile.originalname,
        faceFile.mimetype,
      );
    }

    return this.seedreamService.generate({
      model, prompt, width, height, faceMode, styleImageUrl, faceImageUrl,
    });
  }

  // ── Private: ChainHub async pipeline ────────────────────────────────────

  private async handleChainhub(opts: {
    prompt: string;
    width: number;
    height: number;
    quality: string;
    orientation: string;
    styleFile?: Express.Multer.File;
    faceFile?: Express.Multer.File;
  }): Promise<GenerateResult> {
    const { prompt, width, height, quality, orientation, styleFile, faceFile } = opts;

    return this.chainhubService.createTask({
      prompt,
      width,
      height,
      quality,
      orientation,
      imageBuffer: styleFile?.buffer,
      imageMimeType: styleFile?.mimetype,
      imageBuffer2: faceFile?.buffer,
      imageMimeType2: faceFile?.mimetype,
    });
  }
}
