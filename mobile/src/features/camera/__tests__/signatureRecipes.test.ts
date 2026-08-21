import { compileSignatureImageRecipe } from '../effects/recipes/compileRenderRecipe';
import {
  IDENTITY_COLOR_MATRIX,
  SIGNATURE_IMAGE_RECIPES,
} from '../effects/recipes/signatureRecipes';

describe('AraCam signature image recipes', () => {
  it('defines versioned recipes for Aura, Ember, and Nightglass', () => {
    expect(SIGNATURE_IMAGE_RECIPES.map(({ id, version }) => ({ id, version }))).toEqual([
      { id: 'arawa-aura', version: 1 },
      { id: 'ember-veil', version: 1 },
      { id: 'nightglass', version: 1 },
    ]);
  });

  it.each(['arawa-aura', 'ember-veil', 'nightglass'] as const)(
    'keeps %s deterministic and bounded at both intensity edges',
    (presetId) => {
      expect(compileSignatureImageRecipe(presetId, 0)).toBeNull();
      expect(compileSignatureImageRecipe(presetId, -30)).toBeNull();
      const full = compileSignatureImageRecipe(presetId, 100);
      expect(compileSignatureImageRecipe(presetId, 100)).toEqual(full);
      expect(compileSignatureImageRecipe(presetId, 170)).toEqual(full);
      expect(full?.colorMatrix).toHaveLength(20);
    },
  );

  it('interpolates intensity from the identity matrix without mutating the recipe', () => {
    const half = compileSignatureImageRecipe('arawa-aura', 50)!;
    const full = compileSignatureImageRecipe('arawa-aura', 100)!;

    half.colorMatrix.forEach((value, index) => {
      expect(value).toBeCloseTo(
        IDENTITY_COLOR_MATRIX[index]! +
          (full.colorMatrix[index]! - IDENTITY_COLOR_MATRIX[index]!) * 0.5,
      );
    });
    expect(compileSignatureImageRecipe('original', 100)).toBeNull();
  });
});
