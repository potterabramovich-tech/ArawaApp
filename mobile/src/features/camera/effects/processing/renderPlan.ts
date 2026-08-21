import { clampImageEffectIntensity } from '../effectSelection';
import { ORIGINAL_PRESET_ID } from '../presets';
import type { ImageEffectPresetId } from '../types';
import type { ImageEffectRenderPlan } from './types';

export function createImageEffectRenderPlan(
  presetId: ImageEffectPresetId,
  intensity: number,
): ImageEffectRenderPlan {
  const normalizedIntensity = clampImageEffectIntensity(intensity);
  const isIdentity = presetId === ORIGINAL_PRESET_ID || normalizedIntensity === 0;

  return {
    presetId: isIdentity ? ORIGINAL_PRESET_ID : presetId,
    intensity: isIdentity ? 0 : normalizedIntensity,
    operation: isIdentity ? 'identity' : 'render-preset',
  };
}
