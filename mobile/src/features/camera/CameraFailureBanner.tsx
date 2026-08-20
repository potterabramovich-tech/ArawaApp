import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '@/theme/tokens';
import type { CameraFailure } from './cameraSession';

interface CameraFailureBannerProps {
  actionLabel?: string;
  error: CameraFailure;
  insets: EdgeInsets;
  onRecover: () => void;
}

export function getCameraFailureAccessibilityProps(error: CameraFailure) {
  return {
    accessibilityLabel: `${error.title}. ${error.message}`,
    accessibilityLiveRegion: 'assertive' as const,
    accessibilityRole: 'alert' as const,
    accessibilityViewIsModal: true,
    accessible: true,
  };
}

export function CameraFailureBanner({
  actionLabel = 'Try again',
  error,
  insets,
  onRecover,
}: CameraFailureBannerProps) {
  const card = useRef<View>(null);

  useEffect(() => {
    const node = findNodeHandle(card.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }, [error.code]);

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + spacing.sm }]}>
      <View
        {...getCameraFailureAccessibilityProps(error)}
        onAccessibilityEscape={onRecover}
        ref={card}
        style={styles.card}
      >
        <View style={styles.icon}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.coral} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{error.title}</Text>
          <Text style={styles.message}>{error.message}</Text>
        </View>
        <Pressable
          accessibilityLabel={
            actionLabel === 'Open Settings'
              ? 'Open settings to recover camera access'
              : 'Dismiss camera error and try again'
          }
          accessibilityRole="button"
          onPress={onRecover}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.md,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,122,.36)',
    backgroundColor: 'rgba(16,20,29,.96)',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,107,122,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 3 },
  title: { color: colors.text, fontSize: 14, fontWeight: '800' },
  message: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  retry: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,.18)',
  },
  retryText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.78 },
});
