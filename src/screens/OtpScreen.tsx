import { Feather } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sendPhoneOtp, verifyPhoneOtp } from '../auth/supabase';
import { PressableScale } from '../components/PressableScale';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, contentWrap, radii, spacing, type } from '../theme/tokens';

const RESEND_SECONDS = 30;

export function OtpScreen() {
  const navigation = useNavigation();
  const { phone } = useRoute<RouteProp<RootStackParamList, 'Otp'>>().params;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError(null);
    // On success the session appears and RootNavigator swaps to the
    // signed-in stack — nothing to navigate to here.
    const err = await verifyPhoneOtp(phone, code);
    if (err) {
      setError(err);
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError(await sendPhoneOtp(phone));
    setCooldown(RESEND_SECONDS);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.content, contentWrap]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={13} accessibilityLabel="Back" style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>

        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code by SMS to {phone}.</Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          placeholder="••••••"
          placeholderTextColor={colors.border}
          onSubmitEditing={handleVerify}
        />

        <PressableScale style={styles.primaryButton} onPress={handleVerify} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={styles.primaryText}>Verify</Text>}
        </PressableScale>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={handleResend} disabled={cooldown > 0} hitSlop={8} style={styles.resend}>
          <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.pageGutter,
    gap: spacing.md,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...type.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  codeInput: {
    ...type.amountLg,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 12,
    height: 64,
    borderRadius: radii.button,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
  resend: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  resendText: {
    ...type.label,
    color: colors.accent,
  },
  resendDisabled: {
    color: colors.textSecondary,
  },
});
