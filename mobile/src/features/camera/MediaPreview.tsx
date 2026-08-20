import { useMemo, useReducer } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '@/theme/tokens';
import type { CameraPhoto } from './cameraSession';
import {
  getImageEffectAvailability,
  getLocalImageEffectCapabilities,
  resolvePreviewTreatment,
} from './effects/capabilities';
import {
  createImageEffectSelectionState,
  imageEffectSelectionReducer,
} from './effects/effectSelection';
import { getImageEffectPreset } from './effects/presets';
import { PresetSelector } from './effects/PresetSelector';
import { PreviewEffectLayer } from './effects/PreviewEffectLayer';

interface MediaPreviewProps {
  busyAction: 'saving' | 'sharing' | null;
  canSave: boolean;
  insets: EdgeInsets;
  onRetake: () => void;
  onSave: () => void;
  onShare: () => void;
  photo: CameraPhoto;
}

export function MediaPreview({
  busyAction,
  canSave,
  insets,
  onRetake,
  onSave,
  onShare,
  photo,
}: MediaPreviewProps) {
  const busy = busyAction !== null;
  const capabilities = useMemo(() => getLocalImageEffectCapabilities(), []);
  const [effectSelection, dispatchEffect] = useReducer(
    imageEffectSelectionReducer,
    photo.uri,
    createImageEffectSelectionState,
  );
  const selectedPreset = getImageEffectPreset(effectSelection.selectedPresetId);
  const effectAvailability = getImageEffectAvailability(selectedPreset, capabilities);
  const previewTreatment = resolvePreviewTreatment(
    selectedPreset,
    effectSelection.intensity,
    effectAvailability,
  );

  return (
    <View style={styles.root}>
      <Image accessibilityLabel="Captured moment preview" source={{ uri: photo.uri }} style={styles.image} />
      <PreviewEffectLayer treatment={previewTreatment} />
      <View style={styles.scrim} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityLabel="Retake photo"
          accessibilityRole="button"
          disabled={busy}
          onPress={onRetake}
          style={({ pressed }) => [styles.round, pressed && styles.pressed, busy && styles.disabled]}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <View style={styles.previewPill}>
          <Ionicons name="sparkles" size={16} color={colors.cyan} />
          <Text style={styles.previewText}>
            {photo.source === 'camera' ? 'MOMENT CAPTURED' : 'PHOTO SELECTED'}
          </Text>
        </View>
      </View>

      <View style={[styles.bottomDock, { paddingBottom: insets.bottom + 92 }]}>
        <PresetSelector
          capabilities={capabilities}
          disabled={busy}
          onIntensityChange={(intensity) =>
            dispatchEffect({ type: 'intensity-changed', intensity })
          }
          onPresetSelect={(presetId) => dispatchEffect({ type: 'preset-selected', presetId })}
          onReset={() => dispatchEffect({ type: 'reset' })}
          selection={effectSelection}
        />
        <View style={styles.actions}>
          <PreviewAction
            disabled={busy}
            icon="camera-reverse-outline"
            label="Retake"
            onPress={onRetake}
          />
          <PreviewAction
            active={photo.saved}
            disabled={busy || photo.saved || !canSave}
            icon={photo.saved ? 'checkmark-circle' : 'download-outline'}
            label={photo.saved ? 'Saved' : canSave ? 'Save' : 'Save on device'}
            loading={busyAction === 'saving'}
            onPress={onSave}
          />
          <PreviewAction
            disabled={busy}
            icon="share-outline"
            label="Share"
            loading={busyAction === 'sharing'}
            onPress={onShare}
          />
        </View>
      </View>
    </View>
  );
}

interface PreviewActionProps {
  active?: boolean;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
}

function PreviewAction({ active, disabled, icon, label, loading, onPress }: PreviewActionProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        active && styles.actionActive,
        pressed && !disabled && styles.pressed,
        disabled && !active && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Ionicons name={icon} size={22} color={active ? colors.success : '#fff'} />
      )}
      <Text style={[styles.actionLabel, active && styles.actionLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,.16)',
  },
  header: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(7,9,13,.66)',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPill: {
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(7,9,13,.66)',
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  bottomDock: {
    marginTop: 'auto',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
    backgroundColor: 'rgba(7,9,13,.82)',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    minHeight: 68,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(23,28,39,.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  actionActive: { borderColor: colors.success, backgroundColor: 'rgba(86,227,159,.12)' },
  actionLabel: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  actionLabelActive: { color: colors.success },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
  disabled: { opacity: 0.5 },
});
