import { originalProcessor } from '../effects/processing/originalProcessor';
import { ImageEffectProcessorRegistry } from '../effects/processing/processorRegistry';
import type { ImageEffectProcessor, ImageProcessingCapabilities } from '../effects/processing/types';

const none: ImageProcessingCapabilities = {
  stillImageProcessing: false,
  previewOverlay: false,
  nativePixelProcessing: false,
  gpuProcessing: false,
  realtimeCameraProcessing: false,
  localSceneAnalysis: false,
  provenanceMetadata: false,
};

function processor(
  id: string,
  capabilities: Partial<ImageProcessingCapabilities>,
): ImageEffectProcessor {
  return {
    id,
    capabilities: { ...none, ...capabilities },
    canProcess: () => false,
    process: jest.fn(),
  };
}

describe('image effect processor registry', () => {
  it('reports every processing capability independently', () => {
    const registry = new ImageEffectProcessorRegistry([
      processor('overlay', { previewOverlay: true }),
      processor('native', { stillImageProcessing: true, nativePixelProcessing: true }),
      processor('gpu', { gpuProcessing: true }),
      processor('realtime', { realtimeCameraProcessing: true }),
      processor('scene', { localSceneAnalysis: true }),
      processor('provenance', { provenanceMetadata: true }),
    ]);

    expect(registry.getCapabilities()).toEqual({
      stillImageProcessing: true,
      previewOverlay: true,
      nativePixelProcessing: true,
      gpuProcessing: true,
      realtimeCameraProcessing: true,
      localSceneAnalysis: true,
      provenanceMetadata: true,
    });
  });

  it('does not claim processing capabilities for Original pass-through', () => {
    expect(new ImageEffectProcessorRegistry([originalProcessor]).getCapabilities()).toEqual(none);
  });

  it('selects only a processor that explicitly accepts the render plan', () => {
    const renderer = {
      ...processor('future-renderer', { stillImageProcessing: true }),
      canProcess: (plan: { operation: string }) => plan.operation === 'render-preset',
    };
    const registry = new ImageEffectProcessorRegistry([originalProcessor, renderer]);

    expect(registry.resolve({ presetId: 'original', intensity: 0, operation: 'identity' })).toBe(
      originalProcessor,
    );
    expect(
      registry.resolve({
        presetId: 'nightglass',
        intensity: 60,
        operation: 'render-preset',
      }),
    ).toBe(renderer);
  });
});
