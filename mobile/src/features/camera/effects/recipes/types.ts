import type { ImageEffectPresetId } from '../types';

export type SignatureRecipeId = Exclude<ImageEffectPresetId, 'original'>;

export interface SignatureImageRecipe {
  id: SignatureRecipeId;
  version: number;
  colorMatrix: readonly number[];
}

export interface CompiledSignatureRecipe {
  id: SignatureRecipeId;
  version: number;
  intensity: number;
  colorMatrix: readonly number[];
}
