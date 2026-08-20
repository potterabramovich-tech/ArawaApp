import {
  cameraSessionReducer,
  createCameraFailure,
  getVisibleCameraState,
  initialCameraSessionState,
  mapCameraSessionError,
  openCameraSettingsSafely,
  type CameraPhoto,
  type CameraSessionState,
} from '../cameraSession';

const capturedPhoto: CameraPhoto = {
  fileName: 'moment.jpg',
  mimeType: 'image/jpeg',
  uri: 'file:///moment.jpg',
  source: 'camera',
  saved: false,
};

const libraryPhoto: CameraPhoto = {
  fileName: 'library.jpg',
  mimeType: 'image/jpeg',
  uri: 'file:///library.jpg',
  source: 'library',
  saved: true,
};

describe('cameraSessionReducer permissions', () => {
  it('records a requestable permission denial', () => {
    expect(
      cameraSessionReducer(initialCameraSessionState, {
        type: 'permission-resolved',
        granted: false,
        canAskAgain: true,
      }),
    ).toEqual({ status: 'permission-required', canAskAgain: true });
  });

  it('records a permanent permission denial for Settings recovery', () => {
    expect(
      cameraSessionReducer(initialCameraSessionState, {
        type: 'permission-resolved',
        granted: false,
        canAskAgain: false,
      }),
    ).toEqual({ status: 'permission-required', canAskAgain: false });
  });

  it('moves into the live camera after permission is granted', () => {
    expect(
      cameraSessionReducer(initialCameraSessionState, {
        type: 'permission-resolved',
        granted: true,
        canAskAgain: true,
      }),
    ).toEqual({ status: 'live' });
  });

  it('recovers a permission request failure to the same permission state', () => {
    const permissionState = { status: 'permission-required', canAskAgain: true } as const;
    const failure = cameraSessionReducer(permissionState, {
      type: 'permission-failed',
      error: createCameraFailure('permission-denied'),
    });

    expect(cameraSessionReducer(failure, { type: 'failure-recovered' })).toEqual(
      permissionState,
    );
  });
});

describe('cameraSessionReducer capture and preview', () => {
  it('locks the session in capturing when capture is requested twice', () => {
    const capturing = cameraSessionReducer({ status: 'live' }, { type: 'capture-started' });

    expect(capturing).toEqual({ status: 'capturing' });
    expect(cameraSessionReducer(capturing, { type: 'capture-started' })).toBe(capturing);
  });

  it('moves a completed capture into preview and supports retake', () => {
    const preview = cameraSessionReducer(
      { status: 'capturing' },
      { type: 'capture-succeeded', photo: capturedPhoto },
    );

    expect(preview).toEqual({ status: 'preview-ready', photo: capturedPhoto });
    expect(cameraSessionReducer(preview, { type: 'preview-dismissed' })).toEqual({
      status: 'live',
    });
  });

  it('recovers a failed capture to the live camera', () => {
    const error = createCameraFailure('capture-failed');
    const failure = cameraSessionReducer(
      { status: 'capturing' },
      { type: 'capture-failed', error },
    );

    expect(failure).toEqual({
      status: 'failure',
      error,
      recoverTo: { status: 'live' },
      recoveryAction: 'resume',
    });
    expect(cameraSessionReducer(failure, { type: 'failure-recovered' })).toEqual({
      status: 'live',
    });
  });

  it('recovers a camera mount failure to the live camera', () => {
    const failure = cameraSessionReducer(
      { status: 'live' },
      { type: 'camera-failed', error: createCameraFailure('camera-unavailable') },
    );

    expect(cameraSessionReducer(failure, { type: 'failure-recovered' })).toEqual({
      status: 'live',
    });
    expect(failure).toMatchObject({ recoveryAction: 'remount-camera' });
  });

  it('requires a remount for unknown camera mount failures too', () => {
    const failure = cameraSessionReducer(
      { status: 'live' },
      { type: 'camera-failed', error: createCameraFailure('unknown') },
    );

    expect(failure).toMatchObject({
      status: 'failure',
      recoveryAction: 'remount-camera',
      recoverTo: { status: 'live' },
    });
  });

  it('preserves a preview when camera permission changes', () => {
    const preview: CameraSessionState = { status: 'preview-ready', photo: capturedPhoto };

    expect(
      cameraSessionReducer(preview, {
        type: 'permission-resolved',
        granted: false,
        canAskAgain: false,
      }),
    ).toBe(preview);
  });
});

describe('cameraSessionReducer library selection', () => {
  it('handles gallery cancellation without creating a failure', () => {
    const selecting = cameraSessionReducer({ status: 'live' }, { type: 'library-started' });

    expect(selecting).toEqual({ status: 'selecting-library' });
    expect(cameraSessionReducer(selecting, { type: 'library-cancelled' })).toEqual({
      status: 'live',
    });
  });

  it('moves a selected library image into preview', () => {
    expect(
      cameraSessionReducer(
        { status: 'selecting-library' },
        { type: 'library-selected', photo: libraryPhoto },
      ),
    ).toEqual({ status: 'preview-ready', photo: libraryPhoto });
  });

  it('recovers a gallery failure to the live camera', () => {
    const error = createCameraFailure('library-selection-failed');
    const failure = cameraSessionReducer(
      { status: 'selecting-library' },
      { type: 'library-failed', error },
    );

    expect(cameraSessionReducer(failure, { type: 'failure-recovered' })).toEqual({
      status: 'live',
    });
  });
});

describe('cameraSessionReducer save and share', () => {
  it('marks a captured photo as saved', () => {
    const saving = cameraSessionReducer(
      { status: 'preview-ready', photo: capturedPhoto },
      { type: 'save-started' },
    );

    expect(saving).toEqual({ status: 'saving', photo: capturedPhoto });
    expect(cameraSessionReducer(saving, { type: 'save-succeeded' })).toEqual({
      status: 'preview-ready',
      photo: { ...capturedPhoto, saved: true },
    });
  });

  it('does not save a photo twice', () => {
    const preview: CameraSessionState = { status: 'preview-ready', photo: libraryPhoto };

    expect(cameraSessionReducer(preview, { type: 'save-started' })).toBe(preview);
  });

  it('recovers save and share failures to the same preview', () => {
    const saving: CameraSessionState = { status: 'saving', photo: capturedPhoto };
    const saveFailure = cameraSessionReducer(saving, {
      type: 'save-failed',
      error: createCameraFailure('save-failed'),
    });
    const sharing: CameraSessionState = { status: 'sharing', photo: capturedPhoto };
    const shareFailure = cameraSessionReducer(sharing, {
      type: 'share-failed',
      error: createCameraFailure('share-failed'),
    });

    expect(cameraSessionReducer(saveFailure, { type: 'failure-recovered' })).toEqual({
      status: 'preview-ready',
      photo: capturedPhoto,
    });
    expect(cameraSessionReducer(shareFailure, { type: 'failure-recovered' })).toEqual({
      status: 'preview-ready',
      photo: capturedPhoto,
    });
  });

  it('returns to preview after sharing succeeds', () => {
    const sharing = cameraSessionReducer(
      { status: 'preview-ready', photo: capturedPhoto },
      { type: 'share-started' },
    );

    expect(sharing).toEqual({ status: 'sharing', photo: capturedPhoto });
    expect(cameraSessionReducer(sharing, { type: 'share-succeeded' })).toEqual({
      status: 'preview-ready',
      photo: capturedPhoto,
    });
  });

  it('returns to preview without a failure after sharing is cancelled', () => {
    const sharing: CameraSessionState = { status: 'sharing', photo: capturedPhoto };

    expect(cameraSessionReducer(sharing, { type: 'share-cancelled' })).toEqual({
      status: 'preview-ready',
      photo: capturedPhoto,
    });
  });

  it('maps a Settings launch rejection while preserving Settings recovery', () => {
    const permissionState = { status: 'permission-required', canAskAgain: false } as const;
    const initialFailure = cameraSessionReducer(permissionState, {
      type: 'permission-failed',
      error: createCameraFailure('settings-unavailable'),
    });
    const settingsFailure = cameraSessionReducer(initialFailure, {
      type: 'recovery-failed',
      error: createCameraFailure('settings-unavailable'),
    });

    expect(settingsFailure).toMatchObject({
      status: 'failure',
      error: { code: 'settings-unavailable' },
      recoverTo: permissionState,
      recoveryAction: 'open-settings',
    });
  });
});

describe('camera session failure mapping', () => {
  it('catches a rejected Settings launch and returns a structured failure', async () => {
    const failure = await openCameraSettingsSafely(() =>
      Promise.reject(new Error('Native settings module rejected')),
    );

    expect(failure).toMatchObject({ code: 'settings-unavailable', recoverable: true });
  });

  it('returns no failure when Settings opens', async () => {
    await expect(openCameraSettingsSafely(() => Promise.resolve())).resolves.toBeNull();
  });

  it.each([
    [{ code: 'E_CAMERA_PERMISSION' }, 'capture', 'permission-denied'],
    [{ message: 'Camera is not ready' }, 'capture', 'camera-unavailable'],
    [{ code: 'E_CAPTURE_FAILED' }, 'capture', 'capture-failed'],
    [new Error('Picker crashed'), 'library', 'library-selection-failed'],
    [{ code: 'E_PERMISSION' }, 'save', 'library-permission-denied'],
    [new Error('Disk failed'), 'save', 'save-failed'],
    [new Error('Sharing unavailable'), 'share', 'sharing-unavailable'],
    [new Error('Share failed unexpectedly'), 'share', 'share-failed'],
    [new Error('Settings native module rejected'), 'settings', 'settings-unavailable'],
    [new Error('Unexpected native failure'), 'capture', 'unknown'],
  ] as const)('maps %p during %s to %s', (error, operation, code) => {
    expect(mapCameraSessionError(error, operation)).toMatchObject({ code, recoverable: true });
  });

  it('does not expose arbitrary native error text to the user', () => {
    const error = mapCameraSessionError(new Error('secret native implementation detail'));

    expect(error.message).not.toContain('secret native implementation detail');
  });

  it('keeps the recoverable UI visible while an operation or error is active', () => {
    const preview = { status: 'preview-ready', photo: capturedPhoto } as const;
    const failure: CameraSessionState = {
      status: 'failure',
      error: createCameraFailure('save-failed'),
      recoverTo: preview,
      recoveryAction: 'resume',
    };

    expect(getVisibleCameraState({ status: 'capturing' })).toEqual({ status: 'live' });
    expect(getVisibleCameraState({ status: 'saving', photo: capturedPhoto })).toEqual(preview);
    expect(getVisibleCameraState(failure)).toEqual(preview);
  });
});
