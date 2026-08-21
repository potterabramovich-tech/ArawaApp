import { clampImageEffectIntensity } from '../effectSelection';
import type { ImageEffectPresetId } from '../types';
import { getSignatureImageRecipe, IDENTITY_COLOR_MATRIX } from './signatureRecipes';
import type { CompiledSignatureRecipe } from './types';

export function compileSignatureImageRecipe(
  presetId: ImageEffectPresetId,
  intensity: number,
): CompiledSignatureRecipe | null {
  const normalizedIntensity = clampImageEffectIntensity(intensity);
  if (presetId === 'original' || normalizedIntensity === 0) {
    return null;
  }

  const recipe = getSignatureImageRecipe(presetId);
  if (!recipe) {
    return null;
  }

  const amount = normalizedIntensity / 100;
  return {
    id: recipe.id,
    version: recipe.version,
    intensity: normalizedIntensity,
    colorMatrix: recipe.colorMatrix.map(
      (value, index) => IDENTITY_COLOR_MATRIX[index]! +
        (value - IDENTITY_COLOR_MATRIX[index]!) * amount,
    ),
  };
}
