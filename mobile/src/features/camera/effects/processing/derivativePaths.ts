import type { ImageProcessingRequest } from './types';

export type PreviewDerivativeFormat = 'jpeg' | 'png';

export interface PreviewDerivativeDescriptor {
  extension: 'jpg' | 'png';
  fileName: string;
  format: PreviewDerivativeFormat;
  mimeType: 'image/jpeg' | 'image/png';
}

export function createPreviewDerivativeDescriptor(
  request: Readonly<ImageProcessingRequest>,
  recipeVersion: number,
): PreviewDerivativeDescriptor {
  const png = request.source.mimeType.toLowerCase() === 'image/png';
  const extension = png ? 'png' : 'jpg';
  const safeRequestId = request.id.replace(/[^a-zA-Z0-9_-]/g, '-');
  return {
    extension,
    fileName: `aracam-${request.plan.presetId}-v${recipeVersion}-${request.plan.intensity}-${safeRequestId}.${extension}`,
    format: png ? 'png' : 'jpeg',
    mimeType: png ? 'image/png' : 'image/jpeg',
  };
}

export function calculatePreviewSize(
  width: number,
  height: number,
  maximumEdge = 2048,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('The source image dimensions are invalid.');
  }

  const scale = Math.min(1, maximumEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
