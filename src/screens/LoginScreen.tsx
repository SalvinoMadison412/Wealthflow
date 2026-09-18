import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sendPhoneOtp, signInWithGoogle, supabaseConfigured } from '../auth/supabase';
import { Logo } from '../components/Logo';
import { PressableScale } from '../components/PressableScale';
import { RootStackParamList } from '../navigation/RootNavigator';
import { contentWrap, radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

// Indian numbers by default; anything typed with a leading "+" is taken
// as already international.
function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned.length >= 9 ? cleaned : null;
  return cleaned.length === 10 ? `+91${cleaned}` : null;
}

export function LoginScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<'google' | 'phone' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setBusy('google');
    setError(null);
    setError(await signInWithGoogle());
    setBusy(null);
  };

  const handlePhone = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError('Enter a 10-digit mobile number.');
      return;
    }
    setBusy('phone');
    setError(null);
    const err = await sendPhoneOtp(normalized);
    setBusy(null);
    if (err) setError(err);
    else navigation.navigate('Otp', { phone: normalized });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, contentWrap]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Logo size={56} />
          <Text style={styles.title}>Welcome to WealthFlow</Text>
          <Text style={styles.subtitle}>
            Your statements stay on your device. Sign in so we can personalise the app for you.
          </Text>
        </View>

        {!supabaseConfigured && (
          <Text style={styles.error}>Sign-in isn't configured: add EXPO_PUBLIC_SUPABASE_URL and _ANON_KEY to .env.local.</Text>
        )}

        <PressableScale style={styles.googleButton} onPress={handleGoogle} disabled={busy != null}>
          {busy === 'google' ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <>
              <AntDesign name="google" size={18} color={colors.textPrimary} />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </PressableScale>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or use your phone</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.phoneRow}>
          <Text style={styles.phonePrefix}>+91</Text>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Mobile number"
            placeholderTextColor={colors.textSecondary}
            autoComplete="tel"
            textContentType="telephoneNumber"
            onSubmitEditing={handlePhone}
          />
        </View>

        <PressableScale style={styles.primaryButton} onPress={handlePhone} disabled={busy != null}>
          {busy === 'phone' ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.primaryText}>Send code</Text>
          )}
        </PressableScale>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.pageGutter,
    gap: spacing.md,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  title: {
    ...type.h1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleText: {
    ...type.bodyMedium,
    color: colors.textPrimary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...type.caption,
    color: colors.textSecondary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.button,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phonePrefix: {
    ...type.bodyMedium,
    color: colors.textSecondary,
  },
  phoneInput: {
    ...type.body,
    flex: 1,
    color: colors.textPrimary,
  },
  primaryButton: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    ...type.bodyMedium,
    color: colors.accentText,
  },
  error: {
    ...type.caption,
    color: colors.expenseText,
    textAlign: 'center',
  },
});
