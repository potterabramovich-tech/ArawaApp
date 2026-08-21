import type { ImageEffectSelectionState } from '../types';
import type { ImageEffectProcessorRegistry } from './processorRegistry';
import { createImageEffectRenderPlan } from './renderPlan';
import { createProcessingRequestId } from './requestIds';
import type {
  ImageProcessingRequest,
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
