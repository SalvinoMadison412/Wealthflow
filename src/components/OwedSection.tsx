import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { defaultDirection, OwedDirection, OwedDraft, validateOwedSplit } from '../data/owed';
import { listOwedForTransaction } from '../db/queries';
import { saveOwed } from '../db/transactions';
import { radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';
import { PressableScale } from './PressableScale';

type Choice = 'none' | OwedDirection;
const CHOICES: [Choice, string][] = [
  ['none', 'None'],
  ['to_me', 'Owed to you'],
  ['by_me', 'You owe'],
];

// CategorizeSheet's "Split or owed": who owes whom on this transaction, and
// how much of it. Saving writes only the owed table; totals never change.
export function OwedSection({ transactionId, amount, isDebit }: { transactionId: string; amount: number; isDebit: boolean }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation();
  const [existing] = useState(() => listOwedForTransaction(transactionId));
  const [choice, setChoice] = useState<Choice>(existing[0]?.direction ?? 'none');
  const [drafts, setDrafts] = useState<OwedDraft[]>(
    existing.length > 0 ? existing.map((e) => ({ person: e.person, amount: String(e.amount) })) : [{ person: '', amount: String(amount) }]
  );
  const [error, setError] = useState<string | null>(null);

  function pick(next: Choice) {
    setChoice(next);
    setError(null);
  }

  function update(i: number, patch: Partial<OwedDraft>) {
    setDrafts((list) => list.map((d, j) => (j === i ? { ...d, ...patch } : d)));
    setError(null);
  }

  function save() {
    if (choice === 'none') {
      saveOwed(transactionId, defaultDirection(isDebit), []);
      navigation.goBack();
      return;
    }
    const result = validateOwedSplit(drafts, amount);
    if (!result.ok) return setError(result.error);
    saveOwed(transactionId, choice, result.entries);
    navigation.goBack();
  }

  return (
    <View>
      <Text style={styles.label}>SPLIT OR OWED</Text>
      <View style={styles.segment}>
        {CHOICES.map(([value, text]) => (
          <Pressable
            key={value}
            onPress={() => pick(value)}
            accessibilityRole="button"
            accessibilityState={{ selected: choice === value }}
            style={[styles.segmentItem, choice === value && styles.segmentItemOn]}
          >
            <Text style={[styles.segmentText, choice === value && styles.segmentTextOn]}>{text}</Text>
          </Pressable>
        ))}
      </View>

      {choice !== 'none' && (
        <>
          {drafts.map((d, i) => (
            <View key={i} style={styles.entry}>
              <View style={[styles.field, styles.person]}>
                <Text style={styles.fieldLabel}>Person</Text>
                <TextInput
                  style={styles.input}
                  value={d.person}
                  onChangeText={(person) => update(i, { person })}
                  placeholder="Name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.field, styles.sum]}>
                <Text style={styles.fieldLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  value={d.amount}
                  onChangeText={(v) => update(i, { amount: v })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              {drafts.length > 1 && (
                <Pressable
                  onPress={() => setDrafts((list) => list.filter((_, j) => j !== i))}
                  hitSlop={12}
                  accessibilityLabel={`Remove ${d.person || 'person'}`}
                >
                  <Feather name="x" size={18} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable onPress={() => setDrafts((list) => [...list, { person: '', amount: '' }])} hitSlop={8} style={styles.addRow}>
            <Feather name="plus" size={14} color={colors.accent} />
            <Text style={styles.addText}>Add another person</Text>
          </Pressable>
        </>
      )}

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <View style={styles.hintRow}>
        <Feather name="info" size={12} color={colors.textSecondary} />
        <Text style={styles.hint}>Doesn't change your spending totals.</Text>
      </View>
      <PressableScale style={styles.save} onPress={save}>
        <Text style={styles.saveText}>Save</Text>
      </PressableScale>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    label: { ...type.label, color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm },
    segment: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: radii.pill, padding: 3 },
    segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: radii.pill },
    segmentItemOn: { backgroundColor: colors.card },
    segmentText: { ...type.label, fontSize: 14, color: colors.textSecondary },
    segmentTextOn: { color: colors.textPrimary },
    entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    field: {
      backgroundColor: colors.card,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    person: { flex: 2 },
    sum: { flex: 1 },
    fieldLabel: { ...type.caption, color: colors.textSecondary },
    input: { ...type.bodyMedium, color: colors.textPrimary, padding: 0, minHeight: 24 },
    addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, alignSelf: 'flex-start' },
    addText: { ...type.label, fontSize: 14, color: colors.accent },
    error: { ...type.caption, color: colors.expenseText, marginTop: spacing.sm },
    hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
    hint: { ...type.caption, color: colors.textSecondary },
    save: {
      height: 48,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.lg,
    },
    saveText: { ...type.label, fontSize: 15, color: colors.accentText },
  });
