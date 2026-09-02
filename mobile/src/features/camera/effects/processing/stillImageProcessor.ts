import { compileSignatureImageRecipe } from '../recipes/compileRenderRecipe';
import type { CompiledSignatureRecipe } from '../recipes/types';
import { createPreviewDerivativeDescriptor } from './derivativePaths';
import type {
  ImageEffectProcessor,
  ImageProcessingCapabilities,
  ImageProcessingRequest,
  ImageProcessingResult,
  ProcessingMedia,
} from './types';

export interface RenderedPreview {
  bytes: Uint8Array;
}

export interface SignatureStillImageRenderer {
  render(
    request: Readonly<ImageProcessingRequest>,
    recipe: Readonly<CompiledSignatureRecipe>,
    format: 'jpeg' | 'png',
    isCancelled: () => boolean,
  ): Promise<RenderedPreview>;
}

export interface PreviewDerivativeStorage {
  remove(uri: string): Promise<void>;
  write(fileName: string, bytes: Uint8Array, sourceUri: string): Promise<string>;
  owns(uri: string): boolean;
}

const capabilities: ImageProcessingCapabilities = {
  stillImageProcessing: true,
  previewOverlay: false,
  nativePixelProcessing: true,
  gpuProcessing: true,
  realtimeCameraProcessing: false,
  localSceneAnalysis: false,
  provenanceMetadata: false,
};

export function createSignatureStillImageProcessor(
  renderer: SignatureStillImageRenderer,
  storage: PreviewDerivativeStorage,
): ImageEffectProcessor {
  const activeRequests = new Map<string, { cancelled: boolean }>();

  return {
    id: 'aracam-skia-still-v1',
    capabilities,
    canProcess: (plan) => plan.operation === 'render-preset' &&
      compileSignatureImageRecipe(plan.presetId, plan.intensity) !== null,
    async process(request) {
      if (activeRequests.has(request.id)) {
        throw new Error('This processing request is already active.');
      }
      const cancellation = { cancelled: false };
      activeRequests.set(request.id, cancellation);
      try {
        const recipe = compileSignatureImageRecipe(
          request.plan.presetId,
          request.plan.intensity,
        );
        if (!recipe) {
          throw new Error('No renderable signature recipe is available.');
        }

        const output = createPreviewDerivativeDescriptor(request, recipe.version);
        const isCancelled = () => cancellation.cancelled;
        const rendered = await renderer.render(request, recipe, output.format, isCancelled);
        throwIfCancelled(isCancelled);

        let outputUri: string | null = null;
        try {
          outputUri = await storage.write(output.fileName, rendered.bytes, request.source.uri);
          if (outputUri === request.source.uri || !storage.owns(outputUri)) {
            throw new Error('The renderer did not create an owned derivative.');
          }
          throwIfCancelled(isCancelled);
        } catch (error) {
          if (outputUri && outputUri !== request.source.uri && storage.owns(outputUri)) {
            await storage.remove(outputUri).catch(() => undefined);
          }
          throw error;
        }

        const media: ProcessingMedia = {
          fileName: output.fileName,
          mimeType: output.mimeType,
          uri: outputUri,
        };
        return {
          engineId: 'aracam-skia-still-v1',
          kind: 'derivative',
          media,
          requestId: request.id,
          sourceUri: request.source.uri,
        } satisfies ImageProcessingResult;
      } finally {
        activeRequests.delete(request.id);
      }
    },
    cancel(requestId) {
      const active = activeRequests.get(requestId);
      if (active) active.cancelled = true;
    },
    async release(result) {
      if (
        result.kind === 'derivative' &&
        result.media.uri !== result.sourceUri &&
        storage.owns(result.media.uri)
      ) {
        await storage.remove(result.media.uri);
      }
    },
  };
}

function throwIfCancelled(isCancelled: () => boolean): void {
  if (isCancelled()) {
    throw new Error('Image processing was cancelled.');
  }
}
