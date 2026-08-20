import type { ImageEffectPreset, ImageEffectPresetId } from './types';

export const ORIGINAL_PRESET_ID: ImageEffectPresetId = 'original';

export const ARACAM_SIGNATURE_PRESETS: readonly ImageEffectPreset[] = [
  {
    id: ORIGINAL_PRESET_ID,
    displayName: 'Original',
    category: 'original',
    defaultIntensity: 0,
    processing: {
      pipeline: 'none',
      executionMode: 'none',
      memoryClass: 'minimal',
      requirements: [],
    },
    previewTreatment: null,
  },
  {
    id: 'arawa-aura',
    displayName: 'Aura',
    category: 'radiance',
    defaultIntensity: 58,
    processing: {
      pipeline: 'preview-overlay',
      executionMode: 'interactive-preview',
      memoryClass: 'minimal',
      requirements: ['preview-overlay'],
    },
    previewTreatment: { color: '#7C5CFF', maximumOpacity: 0.22 },
  },
  {
    id: 'ember-veil',
    displayName: 'Ember',
    category: 'warmth',
    defaultIntensity: 52,
    processing: {
      pipeline: 'preview-overlay',
      executionMode: 'interactive-preview',
      memoryClass: 'minimal',
      requirements: ['preview-overlay'],
    },
    previewTreatment: { color: '#FF7048', maximumOpacity: 0.18 },
  },
  {
    id: 'nightglass',
    displayName: 'Nightglass',
    category: 'atmosphere',
    defaultIntensity: 64,
    processing: {
      pipeline: 'preview-overlay',
      executionMode: 'interactive-preview',
      memoryClass: 'minimal',
      requirements: ['preview-overlay'],
    },
    previewTreatment: { color: '#10244C', maximumOpacity: 0.3 },
  },
] as const;

export function getImageEffectPreset(id: ImageEffectPresetId): ImageEffectPreset {
  return (
    ARACAM_SIGNATURE_PRESETS.find((preset) => preset.id === id) ??
    ARACAM_SIGNATURE_PRESETS[0]!
  );
}
