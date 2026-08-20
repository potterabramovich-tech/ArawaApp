import {
  clampImageEffectIntensity,
  createImageEffectSelectionState,
  imageEffectSelectionReducer,
} from '../effects/effectSelection';
import type { ImageEffectSelectionState } from '../effects/types';

function adjustRepeatedly(
  state: ImageEffectSelectionState,
  delta: number,
  repetitions: number,
): ImageEffectSelectionState {
  let nextState = state;
  for (let index = 0; index < repetitions; index += 1) {
    nextState = imageEffectSelectionReducer(nextState, {
      type: 'intensity-adjusted',
      delta,
    });
  }
  return nextState;
}

describe('image effect selection', () => {
  it.each([
    [-20, 0],
    [0, 0],
    [42.6, 43],
    [100, 100],
    [180, 100],
    [Number.NaN, 0],
  ])('clamps intensity %p to %p', (input, expected) => {
    expect(clampImageEffectIntensity(input)).toBe(expected);
  });

  it('starts every source at Original with zero intensity', () => {
    expect(createImageEffectSelectionState('file:///original.jpg')).toEqual({
      sourceUri: 'file:///original.jpg',
      selectedPresetId: 'original',
      intensity: 0,
    });
  });

  it('selects a curated preset at its default intensity and supports boundaries', () => {
    const original = createImageEffectSelectionState('file:///original.jpg');
    const selected = imageEffectSelectionReducer(original, {
      type: 'preset-selected',
      presetId: 'arawa-aura',
    });

    expect(selected).toMatchObject({ selectedPresetId: 'arawa-aura', intensity: 58 });
    expect(
      imageEffectSelectionReducer(selected, { type: 'intensity-changed', intensity: -1 }),
    ).toMatchObject({ intensity: 0 });
    expect(
      imageEffectSelectionReducer(selected, { type: 'intensity-changed', intensity: 101 }),
    ).toMatchObject({ intensity: 100 });
  });

  it('keeps Original at zero even when intensity is changed', () => {
    const original = createImageEffectSelectionState('file:///original.jpg');

    expect(
      imageEffectSelectionReducer(original, { type: 'intensity-changed', intensity: 80 }),
    ).toBe(original);
  });

  it('resets any preset non-destructively to Original', () => {
    const selected = imageEffectSelectionReducer(
      createImageEffectSelectionState('file:///original.jpg'),
      { type: 'preset-selected', presetId: 'nightglass' },
    );

    expect(imageEffectSelectionReducer(selected, { type: 'reset' })).toEqual({
      sourceUri: 'file:///original.jpg',
      selectedPresetId: 'original',
      intensity: 0,
    });
  });

  it('preserves selection for the same preview and resets for new media', () => {
    const selected = imageEffectSelectionReducer(
      createImageEffectSelectionState('file:///first.jpg'),
      { type: 'preset-selected', presetId: 'ember-veil' },
    );

    expect(
      imageEffectSelectionReducer(selected, {
        type: 'source-changed',
        sourceUri: 'file:///first.jpg',
      }),
    ).toBe(selected);
    expect(
      imageEffectSelectionReducer(selected, {
        type: 'source-changed',
        sourceUri: 'file:///second.jpg',
      }),
    ).toEqual(createImageEffectSelectionState('file:///second.jpg'));
  });

  it('applies every queued rapid adjustment against current reducer state', () => {
    const selected = imageEffectSelectionReducer(
      createImageEffectSelectionState('file:///original.jpg'),
      { type: 'preset-selected', presetId: 'arawa-aura' },
    );
    const increased = adjustRepeatedly(selected, 10, 6);
    const decreased = adjustRepeatedly(increased, -10, 12);

    expect(increased.intensity).toBe(100);
    expect(decreased.intensity).toBe(0);
  });

  it('orders rapid preset switches and intensity deltas deterministically', () => {
    const events = [
      { type: 'preset-selected', presetId: 'arawa-aura' },
      { type: 'intensity-adjusted', delta: 10 },
      { type: 'preset-selected', presetId: 'ember-veil' },
      { type: 'intensity-adjusted', delta: 10 },
    ] as const;
    const result = events.reduce(
      (state, event) => imageEffectSelectionReducer(state, event),
      createImageEffectSelectionState('file:///original.jpg'),
    );

    expect(result).toMatchObject({ selectedPresetId: 'ember-veil', intensity: 62 });
  });

  it('ignores queued adjustments while Original is selected', () => {
    const original = createImageEffectSelectionState('file:///original.jpg');

    expect(
      imageEffectSelectionReducer(original, { type: 'intensity-adjusted', delta: 10 }),
    ).toBe(original);
  });
});
