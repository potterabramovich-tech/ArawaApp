import { originalProcessor } from './originalProcessor';
import type {
  ImageEffectProcessor,
  ImageEffectRenderPlan,
  ImageProcessingCapabilities,
} from './types';

const unsupportedCapabilities: ImageProcessingCapabilities = {
  stillImageProcessing: false,
  previewOverlay: false,
  nativePixelProcessing: false,
  gpuProcessing: false,
  realtimeCameraProcessing: false,
  localSceneAnalysis: false,
  provenanceMetadata: false,
};

export class ImageEffectProcessorRegistry {
  private readonly processors: readonly ImageEffectProcessor[];

  constructor(processors: readonly ImageEffectProcessor[] = [originalProcessor]) {
    this.processors = [...processors];
  }

  resolve(plan: Readonly<ImageEffectRenderPlan>): ImageEffectProcessor | null {
    return this.processors.find((processor) => processor.canProcess(plan)) ?? null;
  }

  getCapabilities(): ImageProcessingCapabilities {
    return this.processors.reduce<ImageProcessingCapabilities>(
      (resolved, processor) => ({
        stillImageProcessing:
          resolved.stillImageProcessing || processor.capabilities.stillImageProcessing,
        previewOverlay: resolved.previewOverlay || processor.capabilities.previewOverlay,
        nativePixelProcessing:
          resolved.nativePixelProcessing || processor.capabilities.nativePixelProcessing,
        gpuProcessing: resolved.gpuProcessing || processor.capabilities.gpuProcessing,
        realtimeCameraProcessing:
          resolved.realtimeCameraProcessing || processor.capabilities.realtimeCameraProcessing,
        localSceneAnalysis:
          resolved.localSceneAnalysis || processor.capabilities.localSceneAnalysis,
        provenanceMetadata:
          resolved.provenanceMetadata || processor.capabilities.provenanceMetadata,
      }),
      { ...unsupportedCapabilities },
    );
  }
}

export const imageEffectProcessorRegistry = new ImageEffectProcessorRegistry();
