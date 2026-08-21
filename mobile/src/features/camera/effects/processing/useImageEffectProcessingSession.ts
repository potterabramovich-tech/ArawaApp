import { useEffect, useReducer, useRef } from 'react';
import type { CameraPhoto } from '../../cameraSession';
import type { ImageEffectSelectionState } from '../types';
import {
  createImageProcessingRequest,
  resolveProcessingRequest,
} from './orchestrator';
import {
  createProcessingSessionState,
  processingSessionReducer,
  type ProcessingSessionState,
} from './processingSession';
import {
  imageEffectProcessorRegistry,
  type ImageEffectProcessorRegistry,
} from './processorRegistry';
import type { ImageEffectProcessor, ImageProcessingRequest } from './types';

export function useImageEffectProcessingSession(
  photo: Readonly<CameraPhoto>,
  selection: Readonly<ImageEffectSelectionState>,
  registry: ImageEffectProcessorRegistry = imageEffectProcessorRegistry,
): ProcessingSessionState {
  const [state, dispatch] = useReducer(
    processingSessionReducer,
    photo.uri,
    createProcessingSessionState,
  );
  const activeRequestId = useRef<string | null>(null);

  useEffect(() => {
    dispatch({ type: 'source-changed', sourceUri: photo.uri });

    const request = createImageProcessingRequest(
      {
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        uri: photo.uri,
      },
      selection,
    );
    const resolution = resolveProcessingRequest(request, registry);
    activeRequestId.current = request.id;
    dispatch({ type: 'request-queued', request });

    if (!resolution.processor) {
      dispatch({ type: 'processing-started', requestId: request.id });
      dispatch({
        type: 'processing-failed',
        requestId: request.id,
        error: resolution.error,
      });
      return () => {
        if (activeRequestId.current === request.id) {
          activeRequestId.current = null;
        }
      };
    }

    const processor = resolution.processor;
    dispatch({ type: 'processing-started', requestId: request.id });
    void processSafely(processor, request).then(
      (result) => {
        if (activeRequestId.current === request.id) {
          dispatch({ type: 'processing-succeeded', result });
        }
      },
      () => {
        if (activeRequestId.current === request.id) {
          dispatch({
            type: 'processing-failed',
            requestId: request.id,
            error: {
              code: 'processing-failed',
              message: 'Local image processing could not be completed.',
              recoverable: true,
            },
          });
        }
      },
    );

    return () => {
      if (activeRequestId.current === request.id) {
        activeRequestId.current = null;
        dispatch({ type: 'request-cancelled', requestId: request.id });
        cancelSafely(processor, request.id);
      }
    };
  }, [
    photo.fileName,
    photo.mimeType,
    photo.uri,
    registry,
    selection,
  ]);

  return state;
}

function processSafely(
  processor: ImageEffectProcessor,
  request: Readonly<ImageProcessingRequest>,
) {
  try {
    return Promise.resolve(processor.process(request));
  } catch (error) {
    return Promise.reject(error);
  }
}

function cancelSafely(processor: ImageEffectProcessor, requestId: string): void {
  try {
    void Promise.resolve(processor.cancel?.(requestId)).catch(() => undefined);
  } catch {
    // Cancellation is best-effort; request IDs still reject stale results.
  }
}
