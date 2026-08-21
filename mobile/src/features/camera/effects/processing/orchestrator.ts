import type { ImageEffectSelectionState } from '../types';
import type { ImageEffectProcessorRegistry } from './processorRegistry';
import { createImageEffectRenderPlan } from './renderPlan';
import { createProcessingRequestId } from './requestIds';
import type {
  ImageEffectProcessor,
  ImageProcessingRequest,
  ImageProcessingResult,
  ProcessingFailure,
  ProcessingMedia,
} from './types';

export function createImageProcessingRequest(
  source: Readonly<ProcessingMedia>,
  selection: Readonly<ImageEffectSelectionState>,
): ImageProcessingRequest {
  return {
    id: createProcessingRequestId(),
    source,
    plan: createImageEffectRenderPlan(selection.selectedPresetId, selection.intensity),
  };
}

export function resolveProcessingRequest(
  request: Readonly<ImageProcessingRequest>,
  registry: ImageEffectProcessorRegistry,
) {
  const processor = registry.resolve(request.plan);
  if (!processor) {
    return {
      processor: null,
      error: {
        code: 'engine-unavailable',
        message: 'This look is preview-only because no compatible local renderer is installed.',
        recoverable: true,
      } satisfies ProcessingFailure,
    } as const;
  }

  return { processor, error: null } as const;
}

export function validateProcessingResult(
  request: Readonly<ImageProcessingRequest>,
  processor: ImageEffectProcessor,
  result: Readonly<ImageProcessingResult>,
): ProcessingFailure | null {
  const matchesRequest =
    result.requestId === request.id &&
    result.sourceUri === request.source.uri &&
    result.engineId === processor.id;
  const hasMetadata =
    result.media.fileName.trim().length > 0 &&
    result.media.mimeType.trim().length > 0 &&
    result.media.uri.trim().length > 0;
  const validIdentity =
    result.kind === 'identity' &&
    request.plan.operation === 'identity' &&
    result.media.uri === request.source.uri &&
    result.media.fileName === request.source.fileName &&
    result.media.mimeType === request.source.mimeType;
  const validDerivative =
    result.kind === 'derivative' &&
    request.plan.operation === 'render-preset' &&
    result.media.uri !== request.source.uri;

  if (matchesRequest && hasMetadata && (validIdentity || validDerivative)) {
    return null;
  }

  return {
    code: 'invalid-result',
    message: 'The local processor returned media that did not match its request contract.',
    recoverable: true,
  };
}
