import { originalProcessor } from './originalProcessor';
import type {
  ImageEffectProcessor,
  ImageEffectRenderPlan,
  ImageProcessingCapabilities,
} from './types';

export const unsupportedProcessingCapabilities: ImageProcessingCapabilities = {
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
    return (
      this.processors.find((processor) => {
        try {
          return processor.canProcess(plan);
        } catch {
          return false;
        }
      }) ?? null
    );
  }

  getCapabilities(plan: Readonly<ImageEffectRenderPlan>): ImageProcessingCapabilities {
    const processor = this.resolve(plan);
    return processor
      ? { ...processor.capabilities }
      : { ...unsupportedProcessingCapabilities };
  }
}

export const imageEffectProcessorRegistry = new ImageEffectProcessorRegistry();
