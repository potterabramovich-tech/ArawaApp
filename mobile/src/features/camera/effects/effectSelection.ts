import { getImageEffectPreset, ORIGINAL_PRESET_ID } from './presets';
import type { ImageEffectSelectionEvent, ImageEffectSelectionState } from './types';

export function clampImageEffectIntensity(intensity: number): number {
  if (!Number.isFinite(intensity)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(intensity)));
}

export function createImageEffectSelectionState(sourceUri: string): ImageEffectSelectionState {
  return { sourceUri, selectedPresetId: ORIGINAL_PRESET_ID, intensity: 0 };
}

export function imageEffectSelectionReducer(
  state: ImageEffectSelectionState,
  event: ImageEffectSelectionEvent,
): ImageEffectSelectionState {
  switch (event.type) {
    case 'preset-selected': {
      const preset = getImageEffectPreset(event.presetId);
      return preset.id === ORIGINAL_PRESET_ID
        ? { ...state, selectedPresetId: ORIGINAL_PRESET_ID, intensity: 0 }
        : {
            ...state,
            selectedPresetId: preset.id,
            intensity: clampImageEffectIntensity(preset.defaultIntensity),
          };
    }
    case 'intensity-changed':
      return state.selectedPresetId === ORIGINAL_PRESET_ID
        ? state
        : { ...state, intensity: clampImageEffectIntensity(event.intensity) };
    case 'intensity-adjusted':
      return state.selectedPresetId === ORIGINAL_PRESET_ID
        ? state
        : {
            ...state,
            intensity: clampImageEffectIntensity(state.intensity + event.delta),
          };
    case 'reset':
      return { ...state, selectedPresetId: ORIGINAL_PRESET_ID, intensity: 0 };
    case 'source-changed':
      return event.sourceUri === state.sourceUri
        ? state
        : createImageEffectSelectionState(event.sourceUri);
  }
}
