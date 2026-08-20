import type { PlatformOSType } from 'react-native';

export type ImageEffectPresetId = 'original' | 'arawa-aura' | 'ember-veil' | 'nightglass';
export type ImageEffectCategory =
  | 'original'
  | 'radiance'
  | 'warmth'
  | 'atmosphere'
  | 'enhancement'
  | 'creator';
export type ImageEffectIntensity = number;
export type ImageEffectAvailabilityMode =
  | 'original'
  | 'preview-only'
  | 'local-processing'
  | 'unavailable';
export type ImageEffectPipeline = 'none' | 'preview-overlay' | 'native-pixel-pipeline';
export type ImageEffectMemoryClass = 'minimal' | 'moderate' | 'intensive';
export type ImageEffectRequirement =
  | 'preview-overlay'
  | 'gpu-processing'
  | 'native-pixel-processing'
  | 'local-scene-analysis'
  | 'provenance-metadata';

export interface ImageEffectProcessingRequirements {
  pipeline: ImageEffectPipeline;
  realtime: boolean;
  memoryClass: ImageEffectMemoryClass;
  requirements: readonly ImageEffectRequirement[];
}

export interface ImageEffectPreviewTreatment {
  color: string;
  maximumOpacity: number;
}

export interface ImageEffectPreset {
  id: ImageEffectPresetId;
  displayName: string;
  category: ImageEffectCategory;
  defaultIntensity: ImageEffectIntensity;
  processing: ImageEffectProcessingRequirements;
  previewTreatment: ImageEffectPreviewTreatment | null;
}

export interface ImageEffectCapabilities {
  platform: PlatformOSType;
  previewOverlay: boolean;
  nativePixelProcessing: boolean;
  realtimeCameraProcessing: boolean;
  localSceneAnalysis: boolean;
  provenanceMetadata: boolean;
}

export interface ImageEffectAvailability {
  available: boolean;
  mode: ImageEffectAvailabilityMode;
  reason: string | null;
}

export interface ImageEffectSelectionState {
  sourceUri: string;
  selectedPresetId: ImageEffectPresetId;
  intensity: ImageEffectIntensity;
}

export type ImageEffectSelectionEvent =
  | { type: 'preset-selected'; presetId: ImageEffectPresetId }
  | { type: 'intensity-changed'; intensity: number }
  | { type: 'reset' }
  | { type: 'source-changed'; sourceUri: string };

export interface ResolvedPreviewTreatment {
  kind: 'none' | 'overlay';
  color?: string;
  opacity: number;
}
