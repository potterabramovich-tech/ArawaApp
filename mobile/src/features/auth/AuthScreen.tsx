import { useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { FormField } from '@/components/FormField';
import { GlowButton } from '@/components/GlowButton';
import { useAuthForm } from '@/hooks/useAuthForm';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme/tokens';

export function AuthScreen({ mode }: { mode: 'login' | 'signup' }) {
  const form = useAuthForm(mode);
  const signup = mode === 'signup';
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy || !form.submit()) return;

    setBusy(true);

    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: Linking.createURL('/(auth)/login'),
            data: {
              display_name: form.name.trim(),
              full_name: form.name.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          router.replace('/(tabs)');
        } else {
          Alert.alert(
            'Check your email',
            'Your account was created. Confirm your email, then sign in.',
            [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
          );
        }

        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (error) throw error;

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        signup ? 'Could not create account' : 'Could not sign in',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Ionicons name="arrow-back" color={colors.text} size={24} />
        </Pressable>
        <Text style={styles.step}>{signup ? 'JOIN ARAWA' : 'WELCOME BACK'}</Text>
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>
          {signup ? 'Begin your next chapter.' : 'Continue creating.'}
        </Text>
        <Text style={styles.body}>
          {signup
            ? 'A focused space for ideas, people, and possibility.'
            : 'Sign in to return to your world.'}
        </Text>
      </View>

      <View style={styles.form}>
        {signup && (
          <FormField
            label="Name"
            placeholder="How should we call you?"
            value={form.name}
            onChangeText={form.setName}
            error={form.errors.name}
            autoComplete="name"
          />
        )}

        <FormField
          label="Email"
          placeholder="you@example.com"
          value={form.email}
          onChangeText={form.setEmail}
          error={form.errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <FormField
          label="Password"
          placeholder="At least 8 characters"
          value={form.password}
          onChangeText={form.setPassword}
          error={form.errors.password}
          secureTextEntry
          autoComplete={signup ? 'new-password' : 'current-password'}
        />

        {!signup && (
          <Pressable
            onPress={() =>
              Alert.alert(
                'Password reset',
                'Password recovery is the next authentication step.',
              )
            }
          >
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        )}

        <GlowButton
          label={busy ? 'Please waitâ€¦' : signup ? 'Create account' : 'Sign in'}
          onPress={submit}
          disabled={busy}
        />

        <Text style={styles.legal}>
          {signup
            ? 'By continuing, you agree to Arawaâ€™s Terms and Privacy Policy.'
            : 'Secure authentication powered by Arawa account services.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  step: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  copy: {
    gap: 12,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 45,
    fontWeight: '800',
    letterSpacing: -1.4,
  },
  body: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 25,
  },
  form: {
    gap: spacing.md,
  },
  forgot: {
    color: colors.cyan,
    textAlign: 'right',
    fontWeight: '700',
  },
  legal: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
  },
});
