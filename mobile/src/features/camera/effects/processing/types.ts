import type { ImageEffectPresetId } from '../types';

export type ProcessingRequestId = string;
export type ImageProcessingEngineId = string;
export type ProcessingOutputKind = 'identity' | 'derivative';

export interface ProcessingMedia {
  fileName: string;
  mimeType: string;
  uri: string;
}

export interface ImageProcessingCapabilities {
  stillImageProcessing: boolean;
  previewOverlay: boolean;
  nativePixelProcessing: boolean;
  gpuProcessing: boolean;
  realtimeCameraProcessing: boolean;
  localSceneAnalysis: boolean;
  provenanceMetadata: boolean;
}

export interface ImageEffectRenderPlan {
  presetId: ImageEffectPresetId;
  intensity: number;
  operation: 'identity' | 'render-preset';
}

export interface ImageProcessingRequest {
  id: ProcessingRequestId;
  source: Readonly<ProcessingMedia>;
  plan: Readonly<ImageEffectRenderPlan>;
}

export interface ImageProcessingResult {
  engineId: ImageProcessingEngineId;
  kind: ProcessingOutputKind;
  media: Readonly<ProcessingMedia>;
  requestId: ProcessingRequestId;
  sourceUri: string;
}

export interface ImageEffectProcessor {
  readonly id: ImageProcessingEngineId;
  readonly capabilities: Readonly<ImageProcessingCapabilities>;
  canProcess(plan: Readonly<ImageEffectRenderPlan>): boolean;
  process(request: Readonly<ImageProcessingRequest>): Promise<ImageProcessingResult>;
  cancel?(requestId: ProcessingRequestId): void | Promise<void>;
  release(result: Readonly<ImageProcessingResult>): void | Promise<void>;
}

export type ProcessingFailureCode =
  | 'cancelled'
  | 'engine-unavailable'
  | 'invalid-result'
  | 'processing-failed';

export interface ProcessingFailure {
  code: ProcessingFailureCode;
  message: string;
  recoverable: boolean;
}
