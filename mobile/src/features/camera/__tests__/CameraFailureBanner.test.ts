import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { CameraFailureBanner, getCameraFailureAccessibilityProps } from '../CameraFailureBanner';
import { createCameraFailure } from '../cameraSession';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));

describe('CameraFailureBanner accessibility', () => {
  it('renders a labeled mobile-sized recovery target with a working action', async () => {
    const recover = jest.fn();
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(createElement(CameraFailureBanner, {
        error: createCameraFailure('camera-unavailable'), onRecover: recover,
        insets: { top: 44, bottom: 34, left: 0, right: 0 },
      }));
    });
    try {
      const action = tree.root.findAllByProps({ accessibilityRole: 'button' })
        .find((node) => typeof node.props.onPress === 'function')!;
      const style = StyleSheet.flatten(typeof action.props.style === 'function'
        ? action.props.style({ pressed: false }) : action.props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
      expect(action.props.accessibilityLabel).toBe('Dismiss camera error and try again');
      await act(async () => action.props.onPress());
      expect(recover).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => tree.unmount());
    }
  });

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
