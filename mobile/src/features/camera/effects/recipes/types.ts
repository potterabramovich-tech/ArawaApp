import type { ImageEffectPresetId } from '../types';

export type SignatureRecipeId = Exclude<ImageEffectPresetId, 'original'>;

export interface SignatureImageRecipe {
  id: SignatureRecipeId;
  version: number;
  /** Row-major 4x5 matrix operating on unpremultiplied RGBA in 0..1 units, including offsets. */
  colorMatrix: readonly number[];
}

export interface CompiledSignatureRecipe {
  id: SignatureRecipeId;
  version: number;
  intensity: number;
  colorMatrix: readonly number[];
}
