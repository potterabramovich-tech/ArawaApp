import { getCameraFailureAccessibilityProps } from '../CameraFailureBanner';
import { createCameraFailure } from '../cameraSession';

describe('CameraFailureBanner accessibility', () => {
  it('exposes an assertive modal alert with the full recovery message', () => {
    const error = createCameraFailure('camera-unavailable');

    expect(getCameraFailureAccessibilityProps(error)).toEqual({
      accessibilityLabel: `${error.title}. ${error.message}`,
      accessibilityLiveRegion: 'assertive',
      accessibilityRole: 'alert',
      accessibilityViewIsModal: true,
      accessible: true,
    });
  });
});
