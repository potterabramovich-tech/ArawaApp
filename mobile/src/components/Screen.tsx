import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme/tokens';

type Props = PropsWithChildren<{ scroll?: boolean; style?: StyleProp<ViewStyle> }>;

export function Screen({ children, scroll = false, style }: Props) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.content, style]} showsVerticalScrollIndicator={false}>{children}</ScrollView>
  ) : <View style={[styles.content, style]}>{children}</View>;
  return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.ink }, content: { flexGrow: 1, padding: spacing.lg } });

