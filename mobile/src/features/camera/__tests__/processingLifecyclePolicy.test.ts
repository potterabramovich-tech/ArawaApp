import {
  getProcessingStartDelay,
  isProcessingAppStateActive,
  PREVIEW_RENDER_DEBOUNCE_MS,
} from '../effects/processing/useImageEffectProcessingSession';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

describe('local preview processing lifecycle policy', () => {
  it('debounces expensive rendered previews so rapid changes collapse to the latest request', () => {
    expect(
      getProcessingStartDelay({
        presetId: 'arawa-aura',
        intensity: 58,
        operation: 'render-preset',
      }),
    ).toBe(PREVIEW_RENDER_DEBOUNCE_MS);
    expect(PREVIEW_RENDER_DEBOUNCE_MS).toBeGreaterThanOrEqual(100);
  });

  it('does not delay the exact Original pass-through path', () => {
    expect(
      getProcessingStartDelay({
        presetId: 'original',
        intensity: 0,
        operation: 'identity',
      }),
    ).toBe(0);
  });

  it('pauses for background/inactive states but permits the native initial null state', () => {
    expect(isProcessingAppStateActive('active')).toBe(true);
    expect(isProcessingAppStateActive(null)).toBe(true);
    expect(isProcessingAppStateActive('inactive')).toBe(false);
    expect(isProcessingAppStateActive('background')).toBe(false);
  });
});
