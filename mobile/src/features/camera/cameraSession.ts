export type CameraMediaSource = 'camera' | 'library';

export interface CameraPhoto {
  fileName: string;
  mimeType: string;
  uri: string;
  source: CameraMediaSource;
  saved: boolean;
}

export type CameraFailureCode =
  | 'permission-denied'
  | 'camera-unavailable'
  | 'capture-failed'
  | 'library-selection-failed'
  | 'library-permission-denied'
  | 'save-failed'
  | 'sharing-unavailable'
  | 'share-failed'
  | 'settings-unavailable'
  | 'unknown';

export type CameraOperation = 'permission' | 'capture' | 'library' | 'save' | 'share' | 'settings';
export type CameraRecoveryAction = 'resume' | 'remount-camera' | 'open-settings';

export interface CameraFailure {
  code: CameraFailureCode;
  title: string;
  message: string;
  recoverable: true;
}

export type RecoverableCameraState =
  | { status: 'permission-required'; canAskAgain: boolean }
  | { status: 'live' }
  | { status: 'preview-ready'; photo: CameraPhoto };

export type CameraSessionState =
  | { status: 'permission-checking' }
  | RecoverableCameraState
  | { status: 'capturing' }
  | { status: 'selecting-library' }
  | { status: 'saving'; photo: CameraPhoto }
  | { status: 'sharing'; photo: CameraPhoto }
  | {
      status: 'failure';
      error: CameraFailure;
      recoverTo: RecoverableCameraState;
      recoveryAction: CameraRecoveryAction;
    };

export type CameraSessionEvent =
  | { type: 'permission-resolved'; granted: boolean; canAskAgain: boolean }
  | { type: 'permission-failed'; error: CameraFailure }
  | { type: 'capture-started' }
  | { type: 'capture-succeeded'; photo: CameraPhoto }
  | { type: 'capture-failed'; error: CameraFailure }
  | { type: 'camera-failed'; error: CameraFailure }
  | { type: 'library-started' }
  | { type: 'library-cancelled' }
  | { type: 'library-selected'; photo: CameraPhoto }
  | { type: 'library-failed'; error: CameraFailure }
  | { type: 'preview-dismissed' }
  | { type: 'save-started' }
  | { type: 'save-succeeded' }
  | { type: 'save-failed'; error: CameraFailure }
  | { type: 'share-started' }
  | { type: 'share-succeeded' }
  | { type: 'share-cancelled' }
  | { type: 'share-failed'; error: CameraFailure }
  | { type: 'recovery-failed'; error: CameraFailure }
  | { type: 'failure-recovered' };

export const initialCameraSessionState: CameraSessionState = {
  status: 'permission-checking',
};

export function cameraSessionReducer(
  state: CameraSessionState,
  event: CameraSessionEvent,
): CameraSessionState {
  switch (event.type) {
    case 'permission-resolved':
      if (!event.granted) {
        if (getVisibleCameraState(state)?.status === 'preview-ready') {
          return state;
        }

        return { status: 'permission-required', canAskAgain: event.canAskAgain };
      }

      return state.status === 'permission-checking' || state.status === 'permission-required'
        ? { status: 'live' }
        : state;
    case 'permission-failed':
      return state.status === 'permission-required'
        ? {
            status: 'failure',
            error: event.error,
            recoverTo: state,
            recoveryAction:
              event.error.code === 'settings-unavailable' ? 'open-settings' : 'resume',
          }
        : state;
    case 'capture-started':
      return state.status === 'live' ? { status: 'capturing' } : state;
    case 'capture-succeeded':
      return state.status === 'capturing'
        ? { status: 'preview-ready', photo: event.photo }
        : state;
    case 'capture-failed':
      return state.status === 'capturing'
        ? {
            status: 'failure',
            error: event.error,
            recoverTo: { status: 'live' },
            recoveryAction: 'resume',
          }
        : state;
    case 'camera-failed':
      return state.status === 'live' || state.status === 'capturing'
        ? {
            status: 'failure',
            error: event.error,
            recoverTo: { status: 'live' },
            recoveryAction: 'remount-camera',
          }
        : state;
    case 'library-started':
      return state.status === 'live' ? { status: 'selecting-library' } : state;
    case 'library-cancelled':
      return state.status === 'selecting-library' ? { status: 'live' } : state;
    case 'library-selected':
      return state.status === 'selecting-library'
        ? { status: 'preview-ready', photo: event.photo }
        : state;
    case 'library-failed':
      return state.status === 'selecting-library'
        ? {
            status: 'failure',
            error: event.error,
            recoverTo: { status: 'live' },
            recoveryAction: 'resume',
          }
        : state;
    case 'preview-dismissed':
      return state.status === 'preview-ready' ? { status: 'live' } : state;
    case 'save-started':
      return state.status === 'preview-ready' && !state.photo.saved
        ? { status: 'saving', photo: state.photo }
        : state;
    case 'save-succeeded':
      return state.status === 'saving'
        ? { status: 'preview-ready', photo: { ...state.photo, saved: true } }
        : state;
    case 'save-failed':
      return state.status === 'saving'
        ? {
            status: 'failure',
            error: event.error,
            recoverTo: { status: 'preview-ready', photo: state.photo },
            recoveryAction:
              event.error.code === 'library-permission-denied' ? 'open-settings' : 'resume',
          }
        : state;
    case 'share-started':
      return state.status === 'preview-ready' ? { status: 'sharing', photo: state.photo } : state;
    case 'share-succeeded':
    case 'share-cancelled':
      return state.status === 'sharing'
        ? { status: 'preview-ready', photo: state.photo }
        : state;
    case 'share-failed':
      return state.status === 'sharing'
        ? {
            status: 'failure',
            error: event.error,
            recoverTo: { status: 'preview-ready', photo: state.photo },
            recoveryAction: 'resume',
          }
        : state;
    case 'recovery-failed':
      return state.status === 'failure'
        ? { ...state, error: event.error, recoveryAction: 'open-settings' }
        : state;
    case 'failure-recovered':
      return state.status === 'failure' ? state.recoverTo : state;
  }
}

const failures: Record<CameraFailureCode, Omit<CameraFailure, 'code'>> = {
  'permission-denied': {
    title: 'Camera permission needed',
    message: 'Allow camera access in Settings before trying again.',
    recoverable: true,
  },
  'camera-unavailable': {
    title: 'Camera unavailable',
    message: 'The camera is not ready yet. Wait a moment and try again.',
    recoverable: true,
  },
  'capture-failed': {
    title: 'Could not capture',
    message: 'Arawa could not capture this moment. Please try again.',
    recoverable: true,
  },
  'library-selection-failed': {
    title: 'Could not open photos',
    message: 'Arawa could not select that photo. Please try again.',
    recoverable: true,
  },
  'library-permission-denied': {
    title: 'Photo access needed',
    message: 'Allow Arawa to add photos before saving this moment.',
    recoverable: true,
  },
  'save-failed': {
    title: 'Could not save',
    message: 'This moment could not be saved to your photo library. Please try again.',
    recoverable: true,
  },
  'sharing-unavailable': {
    title: 'Sharing unavailable',
    message: 'Native sharing is not available on this device or browser.',
    recoverable: true,
  },
  'share-failed': {
    title: 'Could not share',
    message: 'This moment could not be shared. Please try again.',
    recoverable: true,
  },
  'settings-unavailable': {
    title: 'Could not open Settings',
    message: 'Arawa could not open device Settings. Please try again or open Settings manually.',
    recoverable: true,
  },
  unknown: {
    title: 'Something went wrong',
    message: 'AraCam ran into an unexpected problem. Please try again.',
    recoverable: true,
  },
};

export function createCameraFailure(code: CameraFailureCode): CameraFailure {
  return { code, ...failures[code] };
}

export async function openCameraSettingsSafely(
  openSettings: () => Promise<unknown>,
): Promise<CameraFailure | null> {
  try {
    await openSettings();
    return null;
  } catch (error) {
    return mapCameraSessionError(error, 'settings');
  }
}

export function mapCameraSessionError(
  error: unknown,
  operation: CameraOperation = 'capture',
): CameraFailure {
  const code = readErrorValue(error, 'code').toLowerCase();
  const message = readErrorValue(error, 'message').toLowerCase();
  const searchable = `${code} ${message}`;

  if (operation === 'settings') {
    return createCameraFailure('settings-unavailable');
  }

  if (searchable.includes('permission')) {
    return createCameraFailure(operation === 'save' ? 'library-permission-denied' : 'permission-denied');
  }

  if (operation === 'library') {
    return createCameraFailure('library-selection-failed');
  }

  if (operation === 'save') {
    return createCameraFailure('save-failed');
  }

  if (operation === 'share') {
    return createCameraFailure(
      searchable.includes('unavailable') || searchable.includes('not available')
        ? 'sharing-unavailable'
        : 'share-failed',
    );
  }

  if (
    searchable.includes('not ready') ||
    searchable.includes('not_ready') ||
    searchable.includes('unavailable')
  ) {
    return createCameraFailure('camera-unavailable');
  }

  if (searchable.includes('capture') || searchable.includes('picture')) {
    return createCameraFailure('capture-failed');
  }

  return createCameraFailure(operation === 'permission' ? 'permission-denied' : 'unknown');
}

export function getVisibleCameraState(state: CameraSessionState): RecoverableCameraState | null {
  if (state.status === 'failure') {
    return state.recoverTo;
  }

  if (
    state.status === 'permission-required' ||
    state.status === 'live' ||
    state.status === 'preview-ready'
  ) {
    return state;
  }

  if (state.status === 'saving' || state.status === 'sharing') {
    return { status: 'preview-ready', photo: state.photo };
  }

  if (state.status === 'capturing' || state.status === 'selecting-library') {
    return { status: 'live' };
  }

  return null;
}

function readErrorValue(error: unknown, key: 'code' | 'message'): string {
  if (typeof error !== 'object' || error === null || !(key in error)) {
    return '';
  }

  const value = error[key as keyof typeof error];
  return typeof value === 'string' ? value : '';
}
