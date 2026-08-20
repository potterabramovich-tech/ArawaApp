import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radii } from '@/theme/tokens';

type Props = PressableProps & { label: string; variant?: 'primary' | 'secondary' };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlowButton({ label, variant = 'primary', disabled, ...props }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimatedPressable accessibilityRole="button" disabled={disabled} onPressIn={() => scale.set(withSpring(.97))} onPressOut={() => scale.set(withSpring(1))} style={[styles.shell, animatedStyle, disabled && styles.disabled]} {...props}>
    {variant === 'primary' ? <LinearGradient colors={[colors.violet, '#6D5EF5', colors.cyan]} start={{x:0,y:.5}} end={{x:1,y:.5}} style={styles.fill}><Text style={styles.label}>{label}</Text></LinearGradient> : <Text style={styles.secondaryLabel}>{label}</Text>}
  </AnimatedPressable>;
}

const styles = StyleSheet.create({ shell:{height:56,borderRadius:radii.md,overflow:'hidden',borderWidth:1,borderColor:colors.line,justifyContent:'center'},fill:{flex:1,alignItems:'center',justifyContent:'center'},label:{color:'#fff',fontSize:16,fontWeight:'800'},secondaryLabel:{color:colors.text,textAlign:'center',fontSize:16,fontWeight:'700'},disabled:{opacity:.55} });
