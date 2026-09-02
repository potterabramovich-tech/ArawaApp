import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '@/theme/tokens';

export const COMPARISON_TOUCH_TARGET_SIZE = 48;

interface OriginalComparisonControlProps {
  presetName: string;
  showingOriginal: boolean;
  onToggle: () => void;
}

export function OriginalComparisonControl({
  presetName,
  showingOriginal,
  onToggle,
}: OriginalComparisonControlProps) {
  const visibleLabel = showingOriginal ? 'Original' : presetName;
  const actionLabel = showingOriginal
    ? `Show rendered ${presetName}`
    : 'Show untouched Original';

  return (
    <View accessibilityLiveRegion="polite" style={styles.row}>
      <Text style={styles.status}>{visibleLabel.toUpperCase()} · LOCAL PREVIEW</Text>
      <Pressable
        accessibilityHint="Switches only the preview. Save and Share still use the untouched original."
        accessibilityLabel={actionLabel}
        accessibilityRole="button"
        accessibilityState={{ selected: showingOriginal }}
        onPress={onToggle}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name="git-compare-outline" size={17} color={colors.cyan} />
        <Text style={styles.buttonText}>{showingOriginal ? presetName : 'Original'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: COMPARISON_TOUCH_TARGET_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  status: { flex: 1, color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  button: {
    minHeight: COMPARISON_TOUCH_TARGET_SIZE,
    minWidth: 112,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  buttonText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
