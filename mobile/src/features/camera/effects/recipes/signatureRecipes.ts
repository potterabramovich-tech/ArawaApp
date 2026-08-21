import type { ImageEffectPresetId } from '../types';
import type { SignatureImageRecipe } from './types';

export const IDENTITY_COLOR_MATRIX = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
] as const;

export const SIGNATURE_IMAGE_RECIPES: readonly SignatureImageRecipe[] = [
  {
    id: 'arawa-aura',
    version: 1,
    colorMatrix: [
      1.04, -0.02, 0.02, 0, 3,
      -0.01, 1.01, 0.03, 0, 0,
      0.03, 0.01, 1.08, 0, 6,
      0, 0, 0, 1, 0,
    ],
  },
  {
    id: 'ember-veil',
    version: 1,
    colorMatrix: [
      1.08, 0.03, -0.02, 0, 5,
      0.02, 1.02, -0.01, 0, 2,
      -0.04, -0.01, 0.94, 0, -2,
      0, 0, 0, 1, 0,
    ],
  },
  {
    id: 'nightglass',
    version: 1,
    colorMatrix: [
      0.92, 0.02, 0.02, 0, -3,
      0.01, 0.96, 0.04, 0, -2,
      0.02, 0.05, 1.08, 0, 4,
      0, 0, 0, 1, 0,
    ],
  },
] as const;

export function getSignatureImageRecipe(
  presetId: ImageEffectPresetId,
): SignatureImageRecipe | null {
  return SIGNATURE_IMAGE_RECIPES.find((recipe) => recipe.id === presetId) ?? null;
}
