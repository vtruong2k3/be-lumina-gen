import {
  Controller, Post, Get, Param, Body, UploadedFiles,
  UseInterceptors, UseGuards, BadRequestException, Sse, MessageEvent,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Observable, interval, from, EMPTY } from 'rxjs';
import { switchMap, map, takeWhile, catchError, distinctUntilChanged } from 'rxjs/operators';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { GenerateService } from './generate.service';
import { ChainhubService } from '../../../external/chainhub/chainhub.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

/** Terminal statuses — SSE stream closes automatically when hit */
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'DONE', 'ERROR']);

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/generate')
export class GenerateController {
  constructor(
    private readonly generateService: GenerateService,
    private readonly chainhubService: ChainhubService,
  ) {}

  // ── POST /ai/generate ─────────────────────────────────────────────────────
  // Strict rate limit: max 5 image generations per minute per IP
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Generate image (Seedream sync or ChainHub async)' })
  @UseInterceptors(FilesInterceptor('files', 2))
  async generate(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const prompt = body.prompt as string;
    if (!prompt) throw new BadRequestException('Prompt is required');

    return this.generateService.generate({
      prompt,
      model: body.model as string,
      width: parseInt(body.width || '1024', 10),
      height: parseInt(body.height || '1024', 10),
      quality: body.quality || 'sd',
      orientation: body.orientation || 'portrait',
      faceMode: body.face_mode === 'true',
      refImageUrl: body.ref_image_url as string | undefined,
      styleFile: files?.find((f) => f.fieldname === 'image'),
      faceFile: files?.find((f) => f.fieldname === 'image_2'),
    });
  }

  // ── GET /ai/generate/:taskId/status ──────────────────────────────────────
  // Legacy one-shot poll (kept for backward compatibility)
  @SkipThrottle()
  @Get(':taskId/status')
  @ApiOperation({ summary: 'One-shot poll ChainHub task status (legacy)' })
  async pollTask(@Param('taskId') taskId: string) {
    return this.chainhubService.pollTask(taskId);
  }

  // ── GET /ai/generate/:taskId/stream ──────────────────────────────────────
  // Server-Sent Events (SSE): Backend polls ChainHub every 2s on behalf of FE.
  // Stream auto-closes when status = COMPLETED | FAILED | DONE | ERROR.
  //
  // FE usage (Next.js):
  //   const es = new EventSource(`/api/ai/generate/${taskId}/stream`, {
  //     withCredentials: true,
  //   });
  //   es.onmessage = (e) => {
  //     const data = JSON.parse(e.data);
  //     // data: { task_id, status, progress, result?, error? }
  //     if (data.status === 'COMPLETED' || data.status === 'FAILED') es.close();
  //   };
  @SkipThrottle()
  @Sse(':taskId/stream')
  @ApiOperation({
    summary: 'SSE stream — real-time task progress (auto-closes on COMPLETED/FAILED)',
  })
  streamTask(@Param('taskId') taskId: string): Observable<MessageEvent> {
    return interval(2000).pipe(
      // On each tick, fetch the current task status from ChainHub
      switchMap(() =>
        from(this.chainhubService.pollTask(taskId)).pipe(
          catchError(() =>
            // If ChainHub is temporarily unreachable, emit a transient error event
            // instead of killing the stream — FE can decide whether to retry
            from([
              {
                task_id: taskId,
                status: 'POLLING_ERROR',
                progress: 0,
                error: 'Could not reach ChainHub — retrying...',
              },
            ]),
          ),
        ),
      ),
      // Drop duplicate emissions where nothing changed (saves FE re-renders)
      distinctUntilChanged(
        (prev, curr) =>
          prev.status === curr.status && prev.progress === curr.progress,
      ),
      // Format each emission as a proper SSE MessageEvent
      map(
        (data): MessageEvent => ({
          data: JSON.stringify(data),
          type: 'message',
          id: taskId,
        }),
      ),
      // Automatically terminate the stream once a terminal status is reached.
      // takeWhile(inclusive=true) emits the FINAL event before closing.
      takeWhile(
        (event: MessageEvent) => {
          const payload = JSON.parse(event.data as string) as { status: string };
          return !TERMINAL_STATUSES.has(payload.status);
        },
        true, // inclusive — emit the terminal event before completing
      ),
      // Safety net: if an unexpected error escapes, close the stream gracefully
      catchError(() => EMPTY),
    );
  }
}
