import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { AGE_RANGES, GOALS, INCOME_RANGES, OCCUPATIONS, Option } from '../auth/profile';
import { FilterChip } from '../components/FilterChip';
import { PressableScale } from '../components/PressableScale';
import { colors, contentWrap, radii, spacing, type } from '../theme/tokens';

// First-run profile form; also reached from Profile › Account to edit.
export function OnboardingScreen() {
  const navigation = useNavigation();
  const { session, profile, saveProfile } = useAuth();
  const editing = profile != null;
  const meta = session?.user.user_metadata as { full_name?: string } | undefined;

  const [fullName, setFullName] = useState(profile?.fullName ?? meta?.full_name ?? '');
  const [email, setEmail] = useState(profile?.email ?? session?.user.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? session?.user.phone ?? '');
  const [ageRange, setAgeRange] = useState(profile?.ageRange ?? null);
  const [incomeRange, setIncomeRange] = useState(profile?.incomeRange ?? null);
  const [goal, setGoal] = useState(profile?.goal ?? null);
  const [occupation, setOccupation] = useState(profile?.occupation ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = fullName.trim().length > 0 && !busy;

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    const err = await saveProfile({
      fullName: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      ageRange,
      incomeRange,
      goal,
      occupation,
    });
    setBusy(false);
    if (err) setError(err);
    else if (editing) navigation.goBack();
    // First run: RootNavigator swaps to the main stack once profile is set.
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, contentWrap]} keyboardShouldPersistTaps="handled">
        {editing && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={13} accessibilityLabel="Back" style={styles.back}>
            <Feather name="arrow-left" size={22} color={colors.textPrimary} />
          </Pressable>
        )}
        <Text style={styles.title}>{editing ? 'Edit profile' : 'Tell us about you'}</Text>
        <Text style={styles.subtitle}>
          This shapes your budget suggestions. It's stored with your account, never your transactions.
        </Text>

        <Field label="NAME">
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor={colors.textSecondary}
            autoComplete="name"
            textContentType="name"
          />
        </Field>
        <Field label="EMAIL">
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@gmail.com"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </Field>
        <Field label="PHONE">
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        </Field>

        <ChipGroup label="AGE" options={AGE_RANGES} value={ageRange} onChange={setAgeRange} />
        <ChipGroup label="MONTHLY INCOME" options={INCOME_RANGES} value={incomeRange} onChange={setIncomeRange} />
        <ChipGroup label="MAIN GOAL" options={GOALS} value={goal} onChange={setGoal} />
        <ChipGroup label="OCCUPATION" options={OCCUPATIONS} value={occupation} onChange={setOccupation} />

        {error && <Text style={styles.error}>{error}</Text>}

        <PressableScale
          style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {busy ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.primaryText}>{editing ? 'Save' : 'Finish'}</Text>
          )}
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => (
          <FilterChip
            key={o.value}
            label={o.label}
            selected={o.value === value}
            onPress={() => onChange(o.value === value ? null : o.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.pageGutter,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  title: {
    ...type.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  input: {
    ...type.body,
    color: colors.textPrimary,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.button,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  primaryButton: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
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
