import { useEffect, useReducer, useRef, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { GlowButton } from '@/components/GlowButton';
import { colors, radii, spacing } from '@/theme/tokens';
import { CameraControls } from './CameraControls';
import { CameraFailureBanner } from './CameraFailureBanner';
import { MediaPreview } from './MediaPreview';
import {
  createCameraPhoto,
  getCameraShareMetadata,
  getRetainedPreviewPhoto,
  isShareCancellation,
  retainPreviewPhoto,
} from './cameraMedia';
import {
  cameraSessionReducer,
  getVisibleCameraState,
  initialCameraSessionState,
  mapCameraSessionError,
  openCameraSettingsSafely,
  type CameraPhoto,
} from './cameraSession';

const backFlashModes: FlashMode[] = ['off', 'auto', 'on'];
const frontFlashModes: FlashMode[] = ['off', 'screen'];

export function CameraScreen() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [session, dispatch] = useReducer(
    cameraSessionReducer,
    initialCameraSessionState,
    () => {
      const retainedPreview = getRetainedPreviewPhoto();
      return retainedPreview
        ? ({ status: 'preview-ready', photo: retainedPreview } as const)
        : initialCameraSessionState;
    },
  );
  const camera = useRef<CameraView>(null);
  const operationLock = useRef(false);
  const insets = useSafeAreaInsets();
  const visibleState = getVisibleCameraState(session);

  useEffect(() => {
    if (permission) {
      dispatch({
        type: 'permission-resolved',
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
      });
    }
  }, [permission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void getPermission().catch((error) => {
          dispatch({ type: 'permission-failed', error: mapCameraSessionError(error, 'permission') });
        });
      }
    });

    return () => subscription.remove();
  }, [getPermission]);

  const requestCameraAccess = async () => {
    try {
      await requestPermission();
    } catch (error) {
      dispatch({ type: 'permission-failed', error: mapCameraSessionError(error, 'permission') });
    }
  };

  const openSettings = async () => {
    const error = await openCameraSettingsSafely(Linking.openSettings);
    if (error) {
      dispatch({ type: 'permission-failed', error });
      void hapticNotification(Haptics.NotificationFeedbackType.Error);
    }
  };

  const capture = async () => {
    if (operationLock.current || session.status !== 'live' || !cameraReady) {
      return;
    }

    operationLock.current = true;
    dispatch({ type: 'capture-started' });
    void hapticImpact(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.85 });

      if (!photo) {
        throw new Error('Camera is not ready');
      }

      const capturedPhoto = createCameraPhoto({
        uri: photo.uri,
        source: 'camera',
        saved: false,
      });
      retainPreviewPhoto(capturedPhoto);
      dispatch({
        type: 'capture-succeeded',
        photo: capturedPhoto,
      });
      void hapticNotification(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      dispatch({ type: 'capture-failed', error: mapCameraSessionError(error, 'capture') });
      void hapticNotification(Haptics.NotificationFeedbackType.Error);
    } finally {
      operationLock.current = false;
    }
  };

  const choosePhoto = async () => {
    if (operationLock.current || session.status !== 'live') {
      return;
    }

    operationLock.current = true;
    dispatch({ type: 'library-started' });
    void hapticSelection();

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.9,
      });

      if (result.canceled) {
        dispatch({ type: 'library-cancelled' });
        return;
      }

      const photo = result.assets[0];
      if (!photo) {
        throw new Error('Image picker returned no photo');
      }

      const selectedPhoto = createCameraPhoto({
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        uri: photo.uri,
        source: 'library',
        saved: true,
      });
      retainPreviewPhoto(selectedPhoto);
      dispatch({
        type: 'library-selected',
        photo: selectedPhoto,
      });
    } catch (error) {
      dispatch({ type: 'library-failed', error: mapCameraSessionError(error, 'library') });
      void hapticNotification(Haptics.NotificationFeedbackType.Error);
    } finally {
      operationLock.current = false;
    }
  };

  const retake = () => {
    if (session.status !== 'preview-ready') {
      return;
    }

    setCameraReady(false);
    retainPreviewPhoto(null);
    dispatch({ type: 'preview-dismissed' });
    void hapticSelection();
  };

  const savePhoto = async () => {
    if (Platform.OS === 'web' || operationLock.current || session.status !== 'preview-ready' || session.photo.saved) {
      return;
    }

    operationLock.current = true;
    const photo = session.photo;
    dispatch({ type: 'save-started' });

    try {
      // The SDK's native media-library classes cannot be evaluated during web/SSR startup.
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Guarded native-only loading avoids evaluating these classes on web.
      const MediaLibrary = require('expo-media-library') as typeof import('expo-media-library');
      const mediaPermission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!mediaPermission.granted) {
        throw { code: 'E_MEDIA_LIBRARY_PERMISSION' };
      }

      await MediaLibrary.Asset.create(photo.uri);
      retainPreviewPhoto({ ...photo, saved: true });
      dispatch({ type: 'save-succeeded' });
      void hapticNotification(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      dispatch({ type: 'save-failed', error: mapCameraSessionError(error, 'save') });
      void hapticNotification(Haptics.NotificationFeedbackType.Error);
    } finally {
      operationLock.current = false;
    }
  };

  const sharePhoto = async () => {
    if (operationLock.current || session.status !== 'preview-ready') {
      return;
    }

    operationLock.current = true;
    const photo = session.photo;
    dispatch({ type: 'share-started' });

    try {
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        throw new Error('Sharing unavailable');
      }

      await Sharing.shareAsync(photo.uri, {
        dialogTitle: 'Share your Arawa moment',
        ...getCameraShareMetadata(photo),
      });
      dispatch({ type: 'share-succeeded' });
    } catch (error) {
      if (isShareCancellation(error)) {
        dispatch({ type: 'share-cancelled' });
        return;
      }

      dispatch({ type: 'share-failed', error: mapCameraSessionError(error, 'share') });
      void hapticNotification(Haptics.NotificationFeedbackType.Error);
    } finally {
      operationLock.current = false;
    }
  };

  const switchCamera = () => {
    if (operationLock.current || session.status !== 'live') {
      return;
    }

    setCameraReady(false);
    setFlash('off');
    setFacing((value) => (value === 'back' ? 'front' : 'back'));
    void hapticSelection();
  };

  const cycleFlash = () => {
    if (operationLock.current || session.status !== 'live') {
      return;
    }

    const modes = facing === 'back' ? backFlashModes : frontFlashModes;
    const currentIndex = modes.indexOf(flash);
    setFlash(modes[(currentIndex + 1) % modes.length] ?? 'off');
    void hapticSelection();
  };

  const recover = () => {
    operationLock.current = false;
    if (session.status === 'failure' && session.recoveryAction === 'remount-camera') {
      setCameraReady(false);
      setCameraAttempt((value) => value + 1);
    }
    dispatch({ type: 'failure-recovered' });
    void hapticSelection();
  };

  const recoverThroughSettings = async () => {
    const error = await openCameraSettingsSafely(Linking.openSettings);
    if (error) {
      dispatch({ type: 'recovery-failed', error });
      void hapticNotification(Haptics.NotificationFeedbackType.Error);
    } else {
      recover();
    }
  };

  const failureNeedsSettings =
    session.status === 'failure' && session.recoveryAction === 'open-settings';

  const previewPhoto = getPreviewPhoto(visibleState);
  if (previewPhoto) {
    return (
      <View style={styles.root}>
        <MediaPreview
          busyAction={
            session.status === 'saving' ? 'saving' : session.status === 'sharing' ? 'sharing' : null
          }
          canSave={Platform.OS !== 'web'}
          insets={insets}
          key={previewPhoto.uri}
          onRetake={retake}
          onSave={savePhoto}
          onShare={sharePhoto}
          photo={previewPhoto}
        />
        {session.status === 'failure' && (
          <CameraFailureBanner
            actionLabel={failureNeedsSettings ? 'Open Settings' : 'Try again'}
            error={session.error}
            insets={insets}
            onRecover={failureNeedsSettings ? recoverThroughSettings : recover}
          />
        )}
      </View>
    );
  }

  if (!permission) {
    return <Screen />;
  }

  if (!permission.granted) {
    const canAskAgain =
      visibleState?.status === 'permission-required'
        ? visibleState.canAskAgain
        : permission.canAskAgain;

    return (
      <View style={styles.root}>
        <Screen style={styles.permission}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={32} color={colors.cyan} />
          </View>
          <Text style={styles.permissionTitle}>Camera access</Text>
          <Text style={styles.permissionBody}>
            {canAskAgain
              ? 'Arawa needs permission only when you choose to capture a moment.'
              : 'Camera access is disabled. Open Settings to allow AraCam to capture moments.'}
          </Text>
          <GlowButton
            accessibilityLabel={canAskAgain ? 'Allow camera access' : 'Open camera settings'}
            label={canAskAgain ? 'Allow camera' : 'Open Settings'}
            onPress={canAskAgain ? requestCameraAccess : openSettings}
          />
        </Screen>
        {session.status === 'failure' && (
          <CameraFailureBanner
            actionLabel={failureNeedsSettings ? 'Open Settings' : 'Try again'}
            error={session.error}
            insets={insets}
            onRecover={failureNeedsSettings ? recoverThroughSettings : recover}
          />
        )}
      </View>
    );
  }

  const cameraBusy = session.status === 'capturing' || session.status === 'selecting-library';
  const controlsDisabled = session.status === 'failure';

  return (
    <View style={styles.root}>
      <CameraView
        flash={flash}
        facing={facing}
        key={`${facing}-${cameraAttempt}`}
        onCameraReady={() => setCameraReady(true)}
        onMountError={(error) =>
          dispatch({ type: 'camera-failed', error: mapCameraSessionError(error, 'capture') })
        }
        ref={camera}
        style={StyleSheet.absoluteFill}
      />
      <CameraControls
        busy={cameraBusy}
        cameraReady={cameraReady}
        disabled={controlsDisabled}
        facing={facing}
        flash={flash}
        insets={insets}
        onCapture={capture}
        onChoosePhoto={choosePhoto}
        onCycleFlash={cycleFlash}
        onSwitchCamera={switchCamera}
      />
      {session.status === 'failure' && (
        <CameraFailureBanner
          actionLabel={failureNeedsSettings ? 'Open Settings' : 'Try again'}
          error={session.error}
          insets={insets}
          onRecover={failureNeedsSettings ? recoverThroughSettings : recover}
        />
      )}
    </View>
  );
}

function getPreviewPhoto(
  state: ReturnType<typeof getVisibleCameraState>,
): CameraPhoto | null {
  return state?.status === 'preview-ready' ? state.photo : null;
}

async function hapticSelection() {
  await Haptics.selectionAsync().catch(() => undefined);
}

async function hapticImpact(style: Haptics.ImpactFeedbackStyle) {
  await Haptics.impactAsync(style).catch(() => undefined);
}

async function hapticNotification(type: Haptics.NotificationFeedbackType) {
  await Haptics.notificationAsync(type).catch(() => undefined);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  permission: { justifyContent: 'center', gap: spacing.md },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: { color: colors.text, fontSize: 30, fontWeight: '800' },
  permissionBody: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
});
