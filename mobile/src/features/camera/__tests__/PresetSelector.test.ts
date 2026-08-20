import { MINIMUM_TOUCH_TARGET_SIZE } from '../effects/PresetSelector';

describe('PresetSelector accessibility sizing', () => {
  it('uses at least a 44-point interaction target for compact intensity controls', () => {
    expect(MINIMUM_TOUCH_TARGET_SIZE).toBeGreaterThanOrEqual(44);
  });
});
