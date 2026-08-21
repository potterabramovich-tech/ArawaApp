import type {
  ImageEffectProcessor,
  ImageProcessingRequest,
  ImageProcessingResult,
} from './types';

export const ORIGINAL_PROCESSOR_ID = 'aracam-original-pass-through';

export const originalProcessor: ImageEffectProcessor = {
  id: ORIGINAL_PROCESSOR_ID,
  capabilities: {
    stillImageProcessing: false,
    previewOverlay: false,
    nativePixelProcessing: false,
    gpuProcessing: false,
    realtimeCameraProcessing: false,
    localSceneAnalysis: false,
    provenanceMetadata: false,
  },
  canProcess: (plan) => plan.operation === 'identity',
  async process(request: Readonly<ImageProcessingRequest>): Promise<ImageProcessingResult> {
    if (request.plan.operation !== 'identity') {
      throw new Error('The Original processor only accepts identity render plans.');
    }

    return {
      engineId: ORIGINAL_PROCESSOR_ID,
      kind: 'identity',
      media: request.source,
      requestId: request.id,
      sourceUri: request.source.uri,
    };
  },
  release: () => undefined,
};
