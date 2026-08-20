import { Platform } from 'react-native';
import type {
  ImageEffectAvailability,
  ImageEffectCapabilities,
  ImageEffectPreset,
  ImageEffectRequirement,
  ResolvedPreviewTreatment,
} from './types';

export function getLocalImageEffectCapabilities(): ImageEffectCapabilities {
  return {
    platform: Platform.OS,
    previewOverlay: true,
    nativePixelProcessing: false,
    gpuProcessing: false,
    realtimeCameraProcessing: false,
    localSceneAnalysis: false,
    provenanceMetadata: false,
  };
}

export function getImageEffectAvailability(
  preset: ImageEffectPreset,
  capabilities: ImageEffectCapabilities,
): ImageEffectAvailability {
  if (preset.processing.pipeline === 'none') {
    return { available: true, mode: 'original', reason: null };
  }

  const requiredCapabilities = new Set<ImageEffectRequirement>(preset.processing.requirements);
  if (preset.processing.pipeline === 'preview-overlay') {
    requiredCapabilities.add('preview-overlay');
  }
  if (preset.processing.pipeline === 'native-pixel-pipeline') {
    requiredCapabilities.add('native-pixel-processing');
  }
  if (preset.processing.executionMode === 'realtime-camera') {
    requiredCapabilities.add('realtime-camera-processing');
  }

  const unsupportedRequirement = Array.from(requiredCapabilities).find(
    (requirement) => !supportsRequirement(requirement, capabilities),
  );

  if (unsupportedRequirement) {
    return {
      available: false,
      mode: 'unavailable',
      reason: `Requires ${humanizeRequirement(unsupportedRequirement)}.`,
    };
  }

  if (preset.processing.pipeline === 'preview-overlay') {
    return {
      available: true,
      mode: 'preview-only',
      reason: 'Preview only. The original media remains unchanged for save and share.',
    };
  }

  return {
    available: capabilities.nativePixelProcessing,
    mode: capabilities.nativePixelProcessing ? 'local-processing' : 'unavailable',
    reason: capabilities.nativePixelProcessing
      ? 'Local native processing is available.'
      : 'Local native image processing is not available in this build.',
  };
}

export function resolvePreviewTreatment(
  preset: ImageEffectPreset,
  intensity: number,
  availability: ImageEffectAvailability,
): ResolvedPreviewTreatment {
  if (
    !availability.available ||
    availability.mode !== 'preview-only' ||
    !preset.previewTreatment ||
    intensity <= 0
  ) {
    return { kind: 'none', opacity: 0 };
  }

  return {
    kind: 'overlay',
    color: preset.previewTreatment.color,
    opacity: preset.previewTreatment.maximumOpacity * (Math.min(100, intensity) / 100),
  };
}

function supportsRequirement(
  requirement: ImageEffectRequirement,
  capabilities: ImageEffectCapabilities,
): boolean {
  switch (requirement) {
    case 'preview-overlay':
      return capabilities.previewOverlay;
    case 'gpu-processing':
      return capabilities.gpuProcessing;
    case 'native-pixel-processing':
      return capabilities.nativePixelProcessing;
    case 'realtime-camera-processing':
      return capabilities.realtimeCameraProcessing;
    case 'local-scene-analysis':
      return capabilities.localSceneAnalysis;
    case 'provenance-metadata':
      return capabilities.provenanceMetadata;
  }
}

function humanizeRequirement(requirement: ImageEffectRequirement): string {
  return requirement.replaceAll('-', ' ');
}
