import { useEffect, useMemo, useReducer, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
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
import type { ImageEffectRenderPlan } from './types';

export const PREVIEW_RENDER_DEBOUNCE_MS = 120;

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
  const [appIsActive, setAppIsActive] = useState(
    isProcessingAppStateActive(AppState.currentState),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const nextIsActive = isProcessingAppStateActive(nextState);
      if (!nextIsActive) {
        coordinator.cancel(undefined, dispatch);
      }
      setAppIsActive(nextIsActive);
    });
    return () => subscription.remove();
  }, [coordinator]);

  useEffect(() => {
    dispatch({ type: 'reset', sourceUri: photo.uri });

    if (!appIsActive) {
      return;
    }

    const request = createImageProcessingRequest(
      {
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        uri: photo.uri,
      },
      selection,
    );
    const timer = setTimeout(
      () => coordinator.start(request, dispatch),
      getProcessingStartDelay(request.plan),
    );

    return () => {
      clearTimeout(timer);
      coordinator.cancel(request.id);
    };
  }, [
    appIsActive,
    coordinator,
    photo.fileName,
    photo.mimeType,
    photo.uri,
    selection,
  ]);

  return state;
}

export function getProcessingStartDelay(plan: Readonly<ImageEffectRenderPlan>): number {
  return plan.operation === 'render-preset' ? PREVIEW_RENDER_DEBOUNCE_MS : 0;
}

export function isProcessingAppStateActive(state: AppStateStatus | null): boolean {
  return state === null || state === 'active';
}
