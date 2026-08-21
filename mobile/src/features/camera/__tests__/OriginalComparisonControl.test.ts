import { COMPARISON_TOUCH_TARGET_SIZE } from '../effects/OriginalComparisonControl';

describe('Original comparison accessibility', () => {
  it('uses a mobile-sized touch target', () => {
    expect(COMPARISON_TOUCH_TARGET_SIZE).toBeGreaterThanOrEqual(44);
  });
});
