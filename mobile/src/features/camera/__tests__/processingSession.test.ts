import {
  createProcessingSessionState,
  processingSessionReducer,
  type ProcessingSessionState,
} from '../effects/processing/processingSession';
import type {
  ImageProcessingRequest,
  ImageProcessingResult,
} from '../effects/processing/types';

function request(id: string, uri = 'file:///one.jpg'): ImageProcessingRequest {
  return {
    id,
    source: { fileName: 'one.jpg', mimeType: 'image/jpeg', uri },
    plan: { presetId: 'arawa-aura', intensity: 50, operation: 'render-preset' },
  };
}

function start(nextRequest: ImageProcessingRequest): ProcessingSessionState {
  return processingSessionReducer(
    processingSessionReducer(createProcessingSessionState(nextRequest.source.uri), {
      type: 'request-queued',
      request: nextRequest,
    }),
    { type: 'processing-started', requestId: nextRequest.id },
  );
}

function result(nextRequest: ImageProcessingRequest): ImageProcessingResult {
  return {
    engineId: 'test',
    kind: 'derivative',
    media: {
      fileName: 'rendered.jpg',
      mimeType: 'image/jpeg',
      uri: `file:///derived-${nextRequest.id}.jpg`,
    },
    requestId: nextRequest.id,
    sourceUri: nextRequest.source.uri,
  };
}

describe('processing session concurrency', () => {
  it('accepts only the current request completion after rapid preset changes', () => {
    const first = request('first');
    const second = request('second');
    const superseded = processingSessionReducer(start(first), {
      type: 'request-queued',
      request: second,
    });
    const processingSecond = processingSessionReducer(superseded, {
      type: 'processing-started',
      requestId: second.id,
    });

    expect(
      processingSessionReducer(processingSecond, {
        type: 'processing-succeeded',
        result: result(first),
      }),
    ).toBe(processingSecond);
    expect(
      processingSessionReducer(processingSecond, {
        type: 'processing-succeeded',
        result: result(second),
      }),
    ).toMatchObject({ status: 'ready', result: { requestId: second.id } });
  });

  it('rejects a result whose source URI does not match the active source', () => {
    const active = request('active');
    const activeState = start(active);
    const mismatched = { ...result(active), sourceUri: 'file:///replaced.jpg' };
    expect(
      processingSessionReducer(activeState, {
        type: 'processing-succeeded',
        result: mismatched,
      }),
    ).toBe(activeState);
  });

  it('cancels only the active request and ignores its later completion', () => {
    const active = request('active');
    const cancelled = processingSessionReducer(start(active), {
      type: 'request-cancelled',
      requestId: active.id,
    });

    expect(cancelled).toEqual({
      status: 'cancelled',
      sourceUri: active.source.uri,
      requestId: active.id,
    });
    expect(
      processingSessionReducer(cancelled, {
        type: 'processing-succeeded',
        result: result(active),
      }),
    ).toBe(cancelled);
  });

  it('resets on preview replacement and ignores the old completion', () => {
    const previous = request('previous');
    const replaced = processingSessionReducer(start(previous), {
      type: 'source-changed',
      sourceUri: 'file:///replacement.png',
    });

    expect(replaced).toEqual({
      status: 'idle',
      sourceUri: 'file:///replacement.png',
    });
    expect(
      processingSessionReducer(replaced, {
        type: 'processing-succeeded',
        result: result(previous),
      }),
    ).toBe(replaced);
  });

  it('supports an explicit lifecycle reset without coupling to camera state', () => {
      const active = request('active');
      expect(
        processingSessionReducer(start(active), {
          type: 'reset',
          sourceUri: active.source.uri,
        }),
      ).toEqual(createProcessingSessionState(active.source.uri));
  });

  it('ignores stale start and failure events', () => {
    const active = request('active');
    const queued = processingSessionReducer(createProcessingSessionState(active.source.uri), {
      type: 'request-queued',
      request: active,
    });
    expect(
      processingSessionReducer(queued, {
        type: 'processing-started',
        requestId: 'stale',
      }),
    ).toBe(queued);
    const activeState = start(active);
    expect(
      processingSessionReducer(activeState, {
        type: 'processing-failed',
        requestId: 'stale',
        error: { code: 'processing-failed', message: 'stale', recoverable: true },
      }),
    ).toBe(activeState);
  });
});
