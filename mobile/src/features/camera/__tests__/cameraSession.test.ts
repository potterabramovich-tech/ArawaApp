import {
  cameraSessionReducer,
  initialCameraSessionState,
  mapCameraSessionError,
  type CameraFailure,
  type CameraSessionState,
} from '../cameraSession';

describe('cameraSessionReducer', () => {
  it('moves from permission checking to the permission request state', () => {
    expect(
      cameraSessionReducer(initialCameraSessionState, {
        type: 'permission-resolved',
        granted: false,
      }),
    ).toEqual({ status: 'permission-required' });
  });

  it('moves into the live camera after permission is granted', () => {
    expect(
      cameraSessionReducer(initialCameraSessionState, {
        type: 'permission-resolved',
        granted: true,
      }),
    ).toEqual({ status: 'live' });
  });

  it('locks the session in capturing when capture is requested twice', () => {
    const capturing = cameraSessionReducer({ status: 'live' }, { type: 'capture-started' });

    expect(capturing).toEqual({ status: 'capturing' });
    expect(cameraSessionReducer(capturing, { type: 'capture-started' })).toBe(capturing);
  });

  it('moves a completed capture into preview and then back to live', () => {
    const preview = cameraSessionReducer(
      { status: 'capturing' },
      { type: 'capture-succeeded', photo: { uri: 'file:///moment.jpg' } },
    );

    expect(preview).toEqual({
      status: 'preview-ready',
      photo: { uri: 'file:///moment.jpg' },
    });
    expect(cameraSessionReducer(preview, { type: 'preview-dismissed' })).toEqual({
      status: 'live',
    });
  });

  it('stores a recoverable capture failure and returns to live', () => {
    const error: CameraFailure = {
      code: 'capture-failed',
      title: 'Could not capture',
      message: 'Try again.',
      recoverable: true,
    };
    const failure = cameraSessionReducer(
      { status: 'capturing' },
      { type: 'capture-failed', error },
    );

    expect(failure).toEqual({ status: 'failure', error, recoverTo: 'live' });
    expect(cameraSessionReducer(failure, { type: 'failure-recovered' })).toEqual({
      status: 'live',
    });
  });

  it('ignores capture completion outside the capturing state', () => {
    const live: CameraSessionState = { status: 'live' };

    expect(
      cameraSessionReducer(live, {
        type: 'capture-succeeded',
        photo: { uri: 'file:///unexpected.jpg' },
      }),
    ).toBe(live);
  });
});

describe('mapCameraSessionError', () => {
  it.each([
    [{ code: 'E_CAMERA_PERMISSION' }, 'permission-denied'],
    [{ message: 'Camera is not ready' }, 'camera-unavailable'],
    [{ code: 'E_CAPTURE_FAILED' }, 'capture-failed'],
    [new Error('Unexpected native failure'), 'unknown'],
  ] as const)('maps %p to %s', (error, code) => {
    expect(mapCameraSessionError(error)).toMatchObject({ code, recoverable: true });
  });

  it('does not expose arbitrary native error text to the user', () => {
    const error = mapCameraSessionError(new Error('secret native implementation detail'));

    expect(error.message).not.toContain('secret native implementation detail');
  });
});
