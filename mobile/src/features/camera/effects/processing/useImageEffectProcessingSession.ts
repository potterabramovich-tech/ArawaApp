import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
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
  const appIsActive = useRef(
    isProcessingAppStateActive(AppState.currentState),
  );
  const routeIsFocused = useRef(false);
  const [lifecycleRevision, invalidateLifecycle] = useReducer((value: number) => value + 1, 0);

  useFocusEffect(useCallback(() => {
    routeIsFocused.current = true;
    invalidateLifecycle();
    return () => {
      routeIsFocused.current = false;
      coordinator.cancel(undefined, dispatch);
      invalidateLifecycle();
    };
  }, [coordinator]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const nextIsActive = isProcessingAppStateActive(nextState);
      appIsActive.current = nextIsActive;
      if (!nextIsActive) {
        coordinator.cancel(undefined, dispatch);
      }
      // A generation records even transitions batched back to the same final state.
      invalidateLifecycle();
    });
    return () => subscription.remove();
  }, [coordinator]);

  useEffect(() => {
    dispatch({ type: 'reset', sourceUri: photo.uri });

    if (!appIsActive.current || !routeIsFocused.current) {
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
      () => {
        if (appIsActive.current && routeIsFocused.current) coordinator.start(request, dispatch);
      },
      getProcessingStartDelay(request.plan),
    );

    return () => {
      clearTimeout(timer);
      coordinator.cancel(request.id);
    };
  }, [
    lifecycleRevision,
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
