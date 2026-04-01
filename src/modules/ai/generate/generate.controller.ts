import {
  Controller, Post, Get, Param, Body, UploadedFiles,
  UseInterceptors, UseGuards, BadRequestException, Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SeedreamService, ALL_SEEDREAM_MODELS } from '../../../external/seedream/seedream.service';
import { ChainhubService } from '../../../external/chainhub/chainhub.service';
import { TmpUploadService } from '../../../external/tmp-upload/tmp-upload.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/generate')
export class GenerateController {
  private readonly logger = new Logger(GenerateController.name);

  constructor(
    private readonly seedreamService: SeedreamService,
    private readonly chainhubService: ChainhubService,
    private readonly tmpUploadService: TmpUploadService,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Generate image (Seedream sync or ChainHub async)' })
  @UseInterceptors(FilesInterceptor('files', 2))
  async generate(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    let prompt = body.prompt as string;
    let model = body.model as string;
    const width = parseInt(body.width || '1024', 10);
    const height = parseInt(body.height || '1024', 10);
    const quality = body.quality || 'sd';
    const orientation = body.orientation || 'portrait';
    const faceMode = body.face_mode === 'true';
    const refImageUrl = body.ref_image_url as string | undefined;

    if (!prompt) throw new BadRequestException('Prompt is required');

    // Extract uploaded files by field name
    const styleFile = files?.find((f) => f.fieldname === 'image');
    const faceFile = files?.find((f) => f.fieldname === 'image_2');

    // @face mode — inject Chinese face-lock prompt + force Seedream 5.0
    const hasFaceRef = !!(faceFile || refImageUrl);
    if (faceMode && hasFaceRef) {
      prompt = prompt.replace(/@face\b/gi, '').trim();
      prompt = `[参考图1为目标人物照片，必须严格还原其身份特征]\n高度保持参考图1中人物的面部特征：面部骨骼结构、眼型、鼻梁高低、唇形、肤色、肤质纹理、脸型宽窄均不可改变，生成图中人物必须与参考图1为同一人物，绝对不能更换人脸。\n场景描述：${prompt}`;
      if (!model?.includes('seedream-5')) {
        model = 'doubao-seedream-5-0-260128';
      }
      this.logger.log(`@face mode activated, model forced to: ${model}`);
    }

    // ── Seedream/Sora sync API ──
    if (model && ALL_SEEDREAM_MODELS.includes(model)) {
      let styleImageUrl: string | null = null;
      let faceImageUrl: string | null = refImageUrl || null;

      if (styleFile) {
        styleImageUrl = await this.tmpUploadService.uploadBuffer(
          styleFile.buffer, styleFile.originalname, styleFile.mimetype,
        );
      }
      if (faceFile) {
        faceImageUrl = await this.tmpUploadService.uploadBuffer(
          faceFile.buffer, faceFile.originalname, faceFile.mimetype,
        );
      }

      const result = await this.seedreamService.generate({
        model, prompt, width, height, faceMode, styleImageUrl, faceImageUrl,
      });
      return result;
    }

    // ── ChainHub legacy async API ──
    const task = await this.chainhubService.createTask({
      prompt, width, height, quality, orientation,
      imageBuffer: styleFile?.buffer,
      imageMimeType: styleFile?.mimetype,
      imageBuffer2: faceFile?.buffer,
      imageMimeType2: faceFile?.mimetype,
    });

    return task; // Returns { task_id, status }
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Poll ChainHub task status' })
  async pollTask(@Param('taskId') taskId: string) {
    return this.chainhubService.pollTask(taskId);
  }
}
