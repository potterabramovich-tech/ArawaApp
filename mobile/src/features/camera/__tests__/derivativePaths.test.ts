import {
  calculatePreviewSize,
  createPreviewDerivativeDescriptor,
} from '../effects/processing/derivativePaths';
import type { ImageProcessingRequest } from '../effects/processing/types';

function request(mimeType: string): ImageProcessingRequest {
  return {
    id: 'request:unsafe/id',
    source: { fileName: 'source', mimeType, uri: 'file:///source' },
    plan: { presetId: 'arawa-aura', intensity: 58, operation: 'render-preset' },
  };
}

describe('preview derivative policy', () => {
  it('preserves PNG preview encoding and safely names the derivative', () => {
    expect(createPreviewDerivativeDescriptor(request('image/png'), 2)).toEqual({
      extension: 'png',
      fileName: 'aracam-arawa-aura-v2-58-request-unsafe-id.png',
      format: 'png',
      mimeType: 'image/png',
    });
  });

  it.each(['image/jpeg', 'image/heic', 'image/heif', 'application/octet-stream'])(
    'uses a separate JPEG preview for %s without changing the source descriptor',
    (mimeType) => {
      const sourceRequest = request(mimeType);
      const before = structuredClone(sourceRequest.source);
      expect(createPreviewDerivativeDescriptor(sourceRequest, 1).mimeType).toBe('image/jpeg');
      expect(sourceRequest.source).toEqual(before);
    },
  );

  it('caps large images without upscaling small images', () => {
    expect(calculatePreviewSize(4032, 3024)).toEqual({ width: 2048, height: 1536 });
    expect(calculatePreviewSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(() => calculatePreviewSize(0, 100)).toThrow();
  });
});
