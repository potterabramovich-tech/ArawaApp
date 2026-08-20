import { StyleSheet, View } from 'react-native';
import type { ResolvedPreviewTreatment } from './types';

interface PreviewEffectLayerProps {
  treatment: ResolvedPreviewTreatment;
}

export function PreviewEffectLayer({ treatment }: PreviewEffectLayerProps) {
  if (treatment.kind === 'none' || !treatment.color || treatment.opacity <= 0) {
    return null;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.overlay, { backgroundColor: treatment.color, opacity: treatment.opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
