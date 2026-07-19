import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';

type Props = TextInputProps & { label: string; error?: string };
export const FormField = forwardRef<TextInput, Props>(({ label, error, onFocus, onBlur, ...props }, ref) => {
  const [focused, setFocused] = useState(false);
  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <TextInput ref={ref} placeholderTextColor={colors.textMuted} style={[styles.input, focused && styles.focused, error && styles.invalid]} onFocus={e => {setFocused(true);onFocus?.(e)}} onBlur={e => {setFocused(false);onBlur?.(e)}} {...props} />
    {!!error && <Text style={styles.error}>{error}</Text>}
  </View>;
});
FormField.displayName = 'FormField';
const styles = StyleSheet.create({group:{gap:8},label:{color:colors.textMuted,fontSize:12,fontWeight:'700',letterSpacing:1,textTransform:'uppercase'},input:{height:56,borderWidth:1,borderColor:colors.line,borderRadius:radii.md,paddingHorizontal:spacing.md,color:colors.text,backgroundColor:colors.surface,fontSize:16},focused:{borderColor:colors.cyan},invalid:{borderColor:colors.coral},error:{color:colors.coral,fontSize:12}});

