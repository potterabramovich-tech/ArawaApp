import { originalProcessor } from '../effects/processing/originalProcessor';
import {
  ImageEffectProcessorRegistry,
  unsupportedProcessingCapabilities,
} from '../effects/processing/processorRegistry';
import type {
  ImageEffectProcessor,
  ImageEffectRenderPlan,
  ImageProcessingCapabilities,
} from '../effects/processing/types';

const none: ImageProcessingCapabilities = unsupportedProcessingCapabilities;
const identityPlan: ImageEffectRenderPlan = {
  presetId: 'original',
  intensity: 0,
  operation: 'identity',
};
const renderPlan: ImageEffectRenderPlan = {
  presetId: 'nightglass',
  intensity: 60,
  operation: 'render-preset',
};

function processor(
  id: string,
  capabilities: Partial<ImageProcessingCapabilities>,
  accepts: (plan: ImageEffectRenderPlan) => boolean = () => false,
): ImageEffectProcessor {
  return {
    id,
    capabilities: { ...none, ...capabilities },
    canProcess: accepts,
    process: jest.fn(),
    release: jest.fn(),
  };
}

describe('image effect processor registry', () => {
  it('reports only the capabilities of the processor selected for a plan', () => {
    const native = processor(
      'native',
      { stillImageProcessing: true, nativePixelProcessing: true },
      (plan) => plan.operation === 'render-preset',
    );
    const unrelatedRealtime = processor('realtime', {
      realtimeCameraProcessing: true,
      gpuProcessing: true,
    });
    const registry = new ImageEffectProcessorRegistry([
      originalProcessor,
      native,
      unrelatedRealtime,
    ]);

    expect(registry.getCapabilities(renderPlan)).toEqual({
      ...none,
      stillImageProcessing: true,
      nativePixelProcessing: true,
    });
    expect(registry.getCapabilities(renderPlan).realtimeCameraProcessing).toBe(false);
    expect(registry.getCapabilities(renderPlan).gpuProcessing).toBe(false);
  });

  it('does not claim processing capabilities for Original pass-through', () => {
    expect(new ImageEffectProcessorRegistry([originalProcessor]).getCapabilities(identityPlan)).toEqual(
      none,
    );
  });

  it('returns unsupported capabilities when no processor accepts the plan', () => {
    expect(new ImageEffectProcessorRegistry([]).getCapabilities(renderPlan)).toEqual(none);
  });

  it('selects only a processor that explicitly accepts the render plan', () => {
    const renderer = processor(
      'future-renderer',
      { stillImageProcessing: true },
      (plan) => plan.operation === 'render-preset',
    );
    const registry = new ImageEffectProcessorRegistry([originalProcessor, renderer]);

    expect(registry.resolve(identityPlan)).toBe(originalProcessor);
    expect(registry.resolve(renderPlan)).toBe(renderer);
  });

  it('degrades safely when a processor capability probe throws', () => {
    const broken = processor('broken', {}, () => {
      throw new Error('probe failure');
    });
    expect(new ImageEffectProcessorRegistry([broken]).resolve(renderPlan)).toBeNull();
  });
});
