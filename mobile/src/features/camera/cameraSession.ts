export interface CameraPhoto {
  uri: string;
}

export type CameraFailureCode =
  | 'permission-denied'
  | 'camera-unavailable'
  | 'capture-failed'
  | 'unknown';

export interface CameraFailure {
  code: CameraFailureCode;
  title: string;
  message: string;
  recoverable: true;
}

export type CameraSessionState =
  | { status: 'permission-checking' }
  | { status: 'permission-required' }
  | { status: 'live' }
  | { status: 'capturing' }
  | { status: 'preview-ready'; photo: CameraPhoto }
  | { status: 'failure'; error: CameraFailure; recoverTo: 'permission-required' | 'live' };

export type CameraSessionEvent =
  | { type: 'permission-resolved'; granted: boolean }
  | { type: 'capture-started' }
  | { type: 'capture-succeeded'; photo: CameraPhoto }
  | { type: 'capture-failed'; error: CameraFailure }
  | { type: 'preview-dismissed' }
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
        return { status: 'permission-required' };
      }

      return state.status === 'permission-checking' || state.status === 'permission-required'
        ? { status: 'live' }
        : state;
    case 'capture-started':
      return state.status === 'live' ? { status: 'capturing' } : state;
    case 'capture-succeeded':
      return state.status === 'capturing'
        ? { status: 'preview-ready', photo: event.photo }
        : state;
    case 'capture-failed':
      return state.status === 'capturing'
        ? { status: 'failure', error: event.error, recoverTo: 'live' }
        : state;
    case 'preview-dismissed':
      return state.status === 'preview-ready' ? { status: 'live' } : state;
    case 'failure-recovered':
      return state.status === 'failure' ? { status: state.recoverTo } : state;
  }
}

const failures: Record<CameraFailureCode, Omit<CameraFailure, 'code'>> = {
  'permission-denied': {
    title: 'Camera permission needed',
    message: 'Allow camera access before trying to capture a moment.',
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
  unknown: {
    title: 'Something went wrong',
    message: 'The camera ran into an unexpected problem. Please try again.',
    recoverable: true,
  },
};

export function mapCameraSessionError(error: unknown): CameraFailure {
  const code = readErrorValue(error, 'code').toLowerCase();
  const message = readErrorValue(error, 'message').toLowerCase();
  const searchable = `${code} ${message}`;

  if (searchable.includes('permission')) {
    return createFailure('permission-denied');
  }

  if (
    searchable.includes('not ready') ||
    searchable.includes('not_ready') ||
    searchable.includes('unavailable')
  ) {
    return createFailure('camera-unavailable');
  }

  if (searchable.includes('capture') || searchable.includes('picture')) {
    return createFailure('capture-failed');
  }

  return createFailure('unknown');
}

function createFailure(code: CameraFailureCode): CameraFailure {
  return { code, ...failures[code] };
}

function readErrorValue(error: unknown, key: 'code' | 'message'): string {
  if (typeof error !== 'object' || error === null || !(key in error)) {
    return '';
  }

  const value = error[key as keyof typeof error];
  return typeof value === 'string' ? value : '';
}
