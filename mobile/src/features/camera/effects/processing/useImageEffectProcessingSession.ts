import { useEffect, useMemo, useReducer } from 'react';
import type { CameraPhoto } from '../../cameraSession';
import type { ImageEffectSelectionState } from '../types';
import { createImageProcessingRequest } from './orchestrator';
import { ImageEffectProcessingCoordinator } from './processingCoordinator';
import {
  createProcessingSessionState,
  processingSessionReducer,
  type ProcessingSessionState,
} from './processingSession';
import {
  imageEffectProcessorRegistry,
  type ImageEffectProcessorRegistry,
} from './processorRegistry';

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
  const coordinator = useMemo(
    () => new ImageEffectProcessingCoordinator(registry),
    [registry],
  );

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
    coordinator.start(request, dispatch);

    return () => coordinator.cancel(request.id);
  }, [
    coordinator,
    photo.fileName,
    photo.mimeType,
    photo.uri,
    selection,
  ]);

  return state;
}
