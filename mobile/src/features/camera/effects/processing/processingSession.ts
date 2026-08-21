import type {
  ImageProcessingRequest,
  ImageProcessingResult,
  ProcessingFailure,
  ProcessingRequestId,
} from './types';

export type ProcessingSessionState =
  | { status: 'idle'; sourceUri: string }
  | { status: 'queued'; request: Readonly<ImageProcessingRequest> }
  | { status: 'processing'; request: Readonly<ImageProcessingRequest> }
  | { status: 'ready'; request: Readonly<ImageProcessingRequest>; result: ImageProcessingResult }
  | {
      status: 'failure';
      request: Readonly<ImageProcessingRequest>;
      error: ProcessingFailure;
    }
  | { status: 'cancelled'; sourceUri: string; requestId: ProcessingRequestId };

export type ProcessingSessionEvent =
  | { type: 'request-queued'; request: Readonly<ImageProcessingRequest> }
  | { type: 'processing-started'; requestId: ProcessingRequestId }
  | { type: 'processing-succeeded'; result: ImageProcessingResult }
  | { type: 'processing-failed'; requestId: ProcessingRequestId; error: ProcessingFailure }
  | { type: 'request-cancelled'; requestId: ProcessingRequestId }
  | { type: 'source-changed'; sourceUri: string }
  | { type: 'reset'; sourceUri: string };

export function createProcessingSessionState(sourceUri: string): ProcessingSessionState {
  return { status: 'idle', sourceUri };
}

export function getActiveProcessingRequestId(
  state: ProcessingSessionState,
): ProcessingRequestId | null {
  return 'request' in state ? state.request.id : null;
}

export function processingSessionReducer(
  state: ProcessingSessionState,
  event: ProcessingSessionEvent,
): ProcessingSessionState {
  switch (event.type) {
    case 'request-queued':
      return { status: 'queued', request: event.request };
    case 'processing-started':
      return state.status === 'queued' && state.request.id === event.requestId
        ? { status: 'processing', request: state.request }
        : state;
    case 'processing-succeeded':
      return acceptsCompletion(state, event.result.requestId, event.result.sourceUri)
        ? { status: 'ready', request: state.request, result: event.result }
        : state;
    case 'processing-failed':
      return state.status === 'processing' && state.request.id === event.requestId
        ? { status: 'failure', request: state.request, error: event.error }
        : state;
    case 'request-cancelled':
      return isActive(state, event.requestId)
        ? {
            status: 'cancelled',
            sourceUri: state.request.source.uri,
            requestId: event.requestId,
          }
        : state;
    case 'source-changed':
      return currentSourceUri(state) === event.sourceUri
        ? state
        : createProcessingSessionState(event.sourceUri);
    case 'reset':
      return createProcessingSessionState(event.sourceUri);
  }
}

function acceptsCompletion(
  state: ProcessingSessionState,
  requestId: ProcessingRequestId,
  sourceUri: string,
): state is Extract<ProcessingSessionState, { status: 'processing' }> {
  return (
    state.status === 'processing' &&
    state.request.id === requestId &&
    state.request.source.uri === sourceUri
  );
}

function isActive(
  state: ProcessingSessionState,
  requestId: ProcessingRequestId,
): state is Extract<ProcessingSessionState, { status: 'queued' | 'processing' }> {
  return (
    (state.status === 'queued' || state.status === 'processing') &&
    state.request.id === requestId
  );
}

function currentSourceUri(state: ProcessingSessionState): string {
  return 'request' in state ? state.request.source.uri : state.sourceUri;
}
