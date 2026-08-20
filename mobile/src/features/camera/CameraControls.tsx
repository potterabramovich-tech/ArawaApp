import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CameraType, FlashMode } from 'expo-camera';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '@/theme/tokens';

interface CameraControlsProps {
  busy: boolean;
  cameraReady: boolean;
  facing: CameraType;
  flash: FlashMode;
  insets: EdgeInsets;
  onCapture: () => void;
  onChoosePhoto: () => void;
  onCycleFlash: () => void;
  onSwitchCamera: () => void;
}

const flashIcons: Record<FlashMode, keyof typeof Ionicons.glyphMap> = {
  auto: 'flash-outline',
  off: 'flash-off-outline',
  on: 'flash-outline',
  screen: 'phone-portrait-outline',
};

export function CameraControls({
  busy,
  cameraReady,
  facing,
  flash,
  insets,
  onCapture,
  onChoosePhoto,
  onCycleFlash,
  onSwitchCamera,
}: CameraControlsProps) {
  const disabled = busy || !cameraReady;
  const flashLabel = flash === 'off' ? 'Flash off' : `Flash ${flash}`;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlay,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 92 },
      ]}
    >
      <View style={styles.top}>
        <View style={styles.modePill}>
          <View style={styles.liveDot} />
          <Text style={styles.mode}>ARACAM</Text>
        </View>
        <View style={styles.topActions}>
          <ControlButton
            accessibilityLabel={flashLabel}
            disabled={busy}
            icon={flashIcons[flash]}
            onPress={onCycleFlash}
            selected={flash !== 'off'}
          />
          <ControlButton
            accessibilityLabel={`Switch to ${facing === 'back' ? 'front' : 'rear'} camera`}
            disabled={busy}
            icon="camera-reverse-outline"
            onPress={onSwitchCamera}
          />
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.sideControl}>
          <ControlButton
            accessibilityLabel="Choose photo from library"
            disabled={busy}
            icon="images-outline"
            onPress={onChoosePhoto}
          />
          <Text style={styles.controlLabel}>Library</Text>
        </View>

        <Pressable
          accessibilityLabel={busy ? 'Capturing photo' : 'Capture photo'}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled }}
          disabled={disabled}
          onPress={onCapture}
          style={({ pressed }) => [
            styles.shutterOuter,
            pressed && !disabled && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <View style={styles.shutter}>
            {busy && <ActivityIndicator color={colors.ink} />}
          </View>
        </Pressable>

        <View style={styles.sideControl}>
          <View style={styles.readyBadge}>
            <Ionicons
              name={cameraReady ? 'checkmark-circle' : 'hourglass-outline'}
              size={24}
              color={cameraReady ? colors.success : colors.textMuted}
            />
          </View>
          <Text style={styles.controlLabel}>{cameraReady ? 'Ready' : 'Starting'}</Text>
        </View>
      </View>
    </View>
  );
}

interface ControlButtonProps {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  selected?: boolean;
}

function ControlButton({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
  selected,
}: ControlButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        selected && styles.roundSelected,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={23} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(0,0,0,.12)',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topActions: { flexDirection: 'row', gap: spacing.sm },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(7,9,13,.58)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.cyan },
  mode: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(7,9,13,.58)',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundSelected: { borderColor: colors.cyan, backgroundColor: 'rgba(56,217,230,.18)' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sideControl: { width: 72, alignItems: 'center', gap: spacing.xs },
  controlLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  readyBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(7,9,13,.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: '#fff',
    padding: 6,
  },
  shutter: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.88 },
  disabled: { opacity: 0.55 },
});
