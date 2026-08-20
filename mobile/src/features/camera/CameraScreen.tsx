import { useEffect, useReducer, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { GlowButton } from '@/components/GlowButton';
import { colors, radii, spacing } from '@/theme/tokens';
import {
  cameraSessionReducer,
  initialCameraSessionState,
  mapCameraSessionError,
} from './cameraSession';

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [session, dispatch] = useReducer(cameraSessionReducer, initialCameraSessionState);
  const camera = useRef<CameraView>(null);
  const captureLock = useRef(false);

  useEffect(() => {
    if (permission) {
      dispatch({ type: 'permission-resolved', granted: permission.granted });
    }
  }, [permission]);

  if (!permission) {
    return <Screen />;
  }

  if (!permission.granted) {
    return (
      <Screen style={styles.permission}>
        <View style={styles.permissionIcon}>
          <Ionicons name="camera-outline" size={32} color={colors.cyan} />
        </View>
        <Text style={styles.permissionTitle}>Camera access</Text>
        <Text style={styles.permissionBody}>
          Arawa needs permission only when you choose to capture a moment.
        </Text>
        <GlowButton label="Allow camera" onPress={requestPermission} />
      </Screen>
    );
  }

  const releasePreview = () => {
    captureLock.current = false;
    dispatch({ type: 'preview-dismissed' });
  };

  const recoverFromFailure = () => {
    captureLock.current = false;
    dispatch({ type: 'failure-recovered' });
  };

  const capture = async () => {
    if (captureLock.current || session.status !== 'live') {
      return;
    }

    captureLock.current = true;
    dispatch({ type: 'capture-started' });

    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.85 });

      if (!photo) {
        throw new Error('Camera is not ready');
      }

      dispatch({ type: 'capture-succeeded', photo: { uri: photo.uri } });
      Alert.alert('Moment captured', 'Editing and publishing arrive with the media backend.');
      releasePreview();
    } catch (error) {
      const cameraError = mapCameraSessionError(error);
      dispatch({ type: 'capture-failed', error: cameraError });
      Alert.alert(cameraError.title, cameraError.message);
      recoverFromFailure();
    }
  };

  return (
    <View style={styles.root}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} />
      <View style={styles.overlay}>
        <View style={styles.top}>
          <Text style={styles.mode}>MOMENT</Text>
          <Pressable
            style={styles.round}
            onPress={() => setFacing((value) => (value === 'back' ? 'front' : 'back'))}
          >
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.hint}>Tap to capture</Text>
          <Pressable
            accessibilityLabel="Capture photo"
            onPress={capture}
            style={styles.shutterOuter}
          >
            <View style={styles.shutter} />
          </Pressable>
          <View style={styles.round}>
            <Ionicons name="images-outline" size={22} color="#fff" />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 64,
    paddingBottom: 112,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(0,0,0,.12)',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mode: { color: '#fff', fontWeight: '800', letterSpacing: 2 },
  round: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { color: '#fff', width: 70, fontSize: 12 },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: '#fff',
    padding: 5,
  },
  shutter: { flex: 1, borderRadius: 34, backgroundColor: '#fff' },
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
