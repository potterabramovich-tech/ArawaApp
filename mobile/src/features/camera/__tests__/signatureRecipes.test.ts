import { compileSignatureImageRecipe } from '../effects/recipes/compileRenderRecipe';
import {
  IDENTITY_COLOR_MATRIX,
  SIGNATURE_IMAGE_RECIPES,
} from '../effects/recipes/signatureRecipes';

describe('AraCam signature image recipes', () => {
  it.each(['arawa-aura', 'ember-veil', 'nightglass'] as const)(
    '%s preserves midtone detail instead of clipping normalized RGB channels',
    (presetId) => {
      const recipe = compileSignatureImageRecipe(presetId, 100)!;
      const input = [0.5, 0.5, 0.5, 1];
      for (let channel = 0; channel < 3; channel += 1) {
        const row = recipe.colorMatrix.slice(channel * 5, channel * 5 + 5);
        const output = input.reduce((sum, value, index) => sum + value * row[index]!, row[4]!);
        expect(output).toBeGreaterThan(0.4);
        expect(output).toBeLessThan(0.65);
      }
      expect(recipe.colorMatrix.slice(15)).toEqual([0, 0, 0, 1, 0]);
    },
  );

  it('defines versioned recipes for Aura, Ember, and Nightglass', () => {
    expect(SIGNATURE_IMAGE_RECIPES.map(({ id, version }) => ({ id, version }))).toEqual([
      { id: 'arawa-aura', version: 2 },
      { id: 'ember-veil', version: 2 },
      { id: 'nightglass', version: 2 },
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
