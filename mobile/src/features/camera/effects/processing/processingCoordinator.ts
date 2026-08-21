import {
  resolveProcessingRequest,
  validateProcessingResult,
} from './orchestrator';
import {
  processingOutputStore,
  type ProcessingOutputStore,
} from './outputStore';
import type { ImageEffectProcessorRegistry } from './processorRegistry';
import type { ProcessingSessionEvent } from './processingSession';
import type {
  ImageEffectProcessor,
  ImageProcessingRequest,
  ImageProcessingResult,
} from './types';

type ProcessingEventSink = (event: ProcessingSessionEvent) => void;

interface ActiveProcessing {
  processor: ImageEffectProcessor;
  request: Readonly<ImageProcessingRequest>;
  result: Readonly<ImageProcessingResult> | null;
}

export class ImageEffectProcessingCoordinator {
  private active: ActiveProcessing | null = null;

  constructor(
    private readonly registry: ImageEffectProcessorRegistry,
    private readonly outputs: ProcessingOutputStore = processingOutputStore,
  ) {}

  start(request: Readonly<ImageProcessingRequest>, emit: ProcessingEventSink): void {
    this.cancel();
    this.retryPendingCleanup();
    emit({ type: 'request-queued', request });

    const resolution = resolveProcessingRequest(request, this.registry);
    emit({ type: 'processing-started', requestId: request.id });
    if (!resolution.processor) {
      emit({ type: 'processing-failed', requestId: request.id, error: resolution.error });
      return;
    }

    const active: ActiveProcessing = {
      processor: resolution.processor,
      request,
      result: null,
    };
    this.active = active;

    void processSafely(active.processor, request).then(
      (result) => this.acceptResult(active, result, emit),
      () => {
        if (this.active === active) {
          this.active = null;
          emit({
            type: 'processing-failed',
            requestId: request.id,
            error: {
              code: 'processing-failed',
              message: 'Local image processing could not be completed.',
              recoverable: true,
            },
          });
        }
      },
    );
  }

  cancel(requestId?: string, emit?: ProcessingEventSink): void {
    const active = this.active;
    if (!active || (requestId && active.request.id !== requestId)) {
      return;
    }

    this.active = null;
    if (!active.result) {
      cancelSafely(active.processor, active.request.id);
    } else {
      this.releaseAcceptedResult(active.result);
    }
    emit?.({ type: 'request-cancelled', requestId: active.request.id });
  }

  retryPendingCleanup(): void {
    void this.outputs.retryFailed().catch(() => undefined);
  }

  private acceptResult(
    active: ActiveProcessing,
    result: Readonly<ImageProcessingResult>,
    emit: ProcessingEventSink,
  ): void {
    const validationError = validateProcessingResult(
      active.request,
      active.processor,
      result,
    );

    if (this.active !== active) {
      this.releaseDetachedResult(
        active.processor,
        result,
        active.request.source.uri,
      );
      return;
    }
    if (validationError) {
      this.active = null;
      this.releaseDetachedResult(
        active.processor,
        result,
        active.request.source.uri,
      );
      emit({
        type: 'processing-failed',
        requestId: active.request.id,
        error: validationError,
      });
      return;
    }

    active.result = result;
    if (result.kind === 'derivative') {
      this.outputs.register(result, {
        remove: () => Promise.resolve(active.processor.release(result)),
      });
    }
    emit({ type: 'processing-succeeded', result });
  }

  private releaseAcceptedResult(result: Readonly<ImageProcessingResult>): void {
    if (result.kind === 'derivative') {
      void this.outputs.release(result.media.uri).catch(() => undefined);
    }
  }

  private releaseDetachedResult(
    processor: ImageEffectProcessor,
    result: Readonly<ImageProcessingResult>,
    sourceUri: string,
  ): void {
    if (result.media.uri === sourceUri) {
      return;
    }
    const ownedResult: ImageProcessingResult =
      result.kind === 'derivative'
        ? result
        : { ...result, kind: 'derivative', sourceUri };
    this.outputs.register(ownedResult, {
      remove: () => Promise.resolve(processor.release(result)),
    });
    void this.outputs.release(ownedResult.media.uri).catch(() => undefined);
  }
}

function processSafely(
  processor: ImageEffectProcessor,
  request: Readonly<ImageProcessingRequest>,
): Promise<ImageProcessingResult> {
  try {
    return Promise.resolve(processor.process(request));
  } catch (error) {
    return Promise.reject(error);
  }
}

function cancelSafely(processor: ImageEffectProcessor, requestId: string): void {
  try {
    void Promise.resolve(processor.cancel?.(requestId)).catch(() => undefined);
  } catch {
    // Request identity still prevents a cancelled job from being accepted.
  }
}
