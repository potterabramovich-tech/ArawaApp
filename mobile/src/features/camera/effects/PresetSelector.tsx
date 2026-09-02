import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '@/theme/tokens';
import { getImageEffectAvailability } from './capabilities';
import { ARACAM_SIGNATURE_PRESETS } from './presets';
import type {
  ImageEffectCapabilities,
  ImageEffectPresetId,
  ImageEffectSelectionState,
} from './types';

interface PresetSelectorProps {
  capabilities: ImageEffectCapabilities;
  disabled: boolean;
  onIntensityAdjust: (delta: number) => void;
  onPresetSelect: (presetId: ImageEffectPresetId) => void;
  onReset: () => void;
  selection: ImageEffectSelectionState;
}

const INTENSITY_STEP = 10;
export const MINIMUM_TOUCH_TARGET_SIZE = 44;

export function PresetSelector({
  capabilities,
  disabled,
  onIntensityAdjust,
  onPresetSelect,
  onReset,
  selection,
}: PresetSelectorProps) {
  const originalSelected = selection.selectedPresetId === 'original';
  const changeIntensity = (amount: number) => onIntensityAdjust(amount);

  return (
    <View accessibilityLabel="AraCam signature presets" style={styles.root}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>ARACAM SIGNATURE</Text>
          <Text style={styles.disclosure}>Local preview when supported · original stays untouched</Text>
        </View>
        {!originalSelected && (
          <Pressable
            accessibilityLabel="Reset image effect to Original"
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onReset}
            style={({ pressed }) => [styles.reset, pressed && styles.pressed]}
          >
            <Ionicons name="refresh" size={14} color={colors.cyan} />
            <Text style={styles.resetText}>Original</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.presetList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {ARACAM_SIGNATURE_PRESETS.map((preset) => {
          const availability = getImageEffectAvailability(preset, capabilities);
          const selected = selection.selectedPresetId === preset.id;
          const unavailable = !availability.available;

          return (
            <Pressable
              accessibilityHint={availability.reason ?? undefined}
              accessibilityLabel={`${preset.displayName} preset`}
              accessibilityRole="button"
              accessibilityState={{ disabled: disabled || unavailable, selected }}
              disabled={disabled || unavailable}
              key={preset.id}
              onPress={() => onPresetSelect(preset.id)}
              style={({ pressed }) => [
                styles.preset,
                selected && styles.presetSelected,
                unavailable && styles.unavailable,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: preset.previewTreatment?.color ?? colors.surfaceRaised,
                    opacity: preset.id === 'original' ? 1 : 0.82,
                  },
                ]}
              >
                {preset.id === 'original' && (
                  <Ionicons name="image-outline" size={18} color={colors.text} />
                )}
              </View>
              <Text numberOfLines={1} style={[styles.presetName, selected && styles.selectedText]}>
                {preset.displayName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        accessibilityActions={[
          { name: 'decrement', label: 'Decrease intensity' },
          { name: 'increment', label: 'Increase intensity' },
        ]}
        accessibilityLabel="Preset intensity"
        accessibilityRole="adjustable"
        accessibilityState={{ disabled: disabled || originalSelected }}
        accessibilityValue={{ min: 0, max: 100, now: selection.intensity }}
        onAccessibilityAction={(event) => {
          if (disabled || originalSelected) return;
          if (event.nativeEvent.actionName === 'increment') changeIntensity(INTENSITY_STEP);
          if (event.nativeEvent.actionName === 'decrement') changeIntensity(-INTENSITY_STEP);
        }}
        style={styles.intensityRow}
      >
        <IntensityButton
          accessibilityLabel="Decrease preset intensity"
          disabled={disabled || originalSelected || selection.intensity === 0}
          icon="remove"
          onPress={() => changeIntensity(-INTENSITY_STEP)}
        />
        <View style={styles.intensityTrack}>
          <View style={[styles.intensityFill, { width: `${selection.intensity}%` }]} />
        </View>
        <Text style={styles.intensityValue}>{selection.intensity}</Text>
        <IntensityButton
          accessibilityLabel="Increase preset intensity"
          disabled={disabled || originalSelected || selection.intensity === 100}
          icon="add"
          onPress={() => changeIntensity(INTENSITY_STEP)}
        />
      </View>
    </View>
  );
}

interface IntensityButtonProps {
  accessibilityLabel: string;
  disabled: boolean;
  icon: 'add' | 'remove';
  onPress: () => void;
}

function IntensityButton({ accessibilityLabel, disabled, icon, onPress }: IntensityButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.intensityButton, disabled && styles.unavailable, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={17} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingCopy: { flex: 1, paddingRight: spacing.sm },
  eyebrow: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  disclosure: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  reset: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: MINIMUM_TOUCH_TARGET_SIZE,
    paddingHorizontal: spacing.sm,
  },
  resetText: { color: colors.cyan, fontSize: 11, fontWeight: '800' },
  presetList: { gap: spacing.sm, paddingRight: spacing.md },
  preset: {
    width: 70,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetSelected: { borderColor: colors.cyan, backgroundColor: 'rgba(56,217,230,.10)' },
  swatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  presetName: { color: colors.textMuted, fontSize: 10, fontWeight: '700', maxWidth: 66 },
  selectedText: { color: colors.text },
  intensityRow: {
    minHeight: MINIMUM_TOUCH_TARGET_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  intensityButton: {
    width: MINIMUM_TOUCH_TARGET_SIZE,
    height: MINIMUM_TOUCH_TARGET_SIZE,
    borderRadius: MINIMUM_TOUCH_TARGET_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
  },
  intensityTrack: { flex: 1, height: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.line },
  intensityFill: { height: '100%', backgroundColor: colors.cyan },
  intensityValue: { width: 28, color: colors.text, textAlign: 'right', fontSize: 11, fontWeight: '800' },
  unavailable: { opacity: 0.42 },
  pressed: { opacity: 0.72 },
});
