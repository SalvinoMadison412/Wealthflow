import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { CategoryPill } from '../components/CategoryPill';
import { Donut } from '../components/Donut';
import { PressableScale } from '../components/PressableScale';
import { ProgressBar } from '../components/ProgressBar';
import { Bucket, bucketTotals, isValidPreset, planned, Preset, PRESETS } from '../data/budget';
import { CategoryBudgetRow, getCategoryBudgetRows, getIncomeForMonth, getSetting } from '../db/queries';
import { setCategoryBucket, setCategoryBudget, setSetting } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { colors, pillPalette, radii, spacing, type } from '../theme/tokens';

const BUCKETS: Bucket[] = ['needs', 'wants', 'savings'];
const BUCKET_COLOR_INDEX: Record<Bucket, number> = { needs: 0, wants: 5, savings: 1 };
const BUCKET_LABEL: Record<Bucket, string> = { needs: 'Needs', wants: 'Wants', savings: 'Savings' };
const PRESET_KEYS: ('50/30/20' | '60/20/20' | 'custom')[] = ['50/30/20', '60/20/20', 'custom'];

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatRupees(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function nextBucket(bucket: Bucket): Bucket {
  const i = BUCKETS.indexOf(bucket);
  return BUCKETS[(i + 1) % BUCKETS.length];
}

export function BudgetScreen() {
  const [month, setMonth] = useState(currentMonthKey);
  const [presetKey, setPresetKey] = useState<'50/30/20' | '60/20/20' | 'custom'>('60/20/20');
  const [customPreset, setCustomPreset] = useState<Preset>({ needs: 50, wants: 30, savings: 20 });
  const [incomeInput, setIncomeInput] = useState('');

  const realIncome = useQuery(() => getIncomeForMonth(month), [month]);
  const incomeSetting = useQuery(() => getSetting('monthly_income'), []);
  const rows = useQuery(() => getCategoryBudgetRows(month), [month]);

  const income = realIncome > 0 ? realIncome : Number(incomeSetting ?? 0);
  const preset = presetKey === 'custom' ? customPreset : PRESETS[presetKey];

  function saveIncome() {
    const parsed = Number(incomeInput);
    if (!incomeInput.trim() || Number.isNaN(parsed) || parsed <= 0) return;
    setSetting('monthly_income', String(parsed));
    setIncomeInput('');
  }

  if (income === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <AppHeader />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Set your monthly income</Text>
          <Text style={styles.emptySubtitle}>
            No income yet for {monthLabel(month)}. Enter your usual monthly income to start planning a
            budget.
          </Text>
          <View style={styles.incomeRow}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              style={styles.incomeInput}
              value={incomeInput}
              onChangeText={setIncomeInput}
              keyboardType="decimal-pad"
              placeholder="50,000"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <PressableScale style={styles.emptyButton} onPress={saveIncome}>
            <Text style={styles.emptyButtonText}>Save</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  const actual = bucketTotals(rows.map((r) => ({ bucket: r.bucket, spent: r.spent })));
  const totalSpent = actual.needs + actual.wants + actual.savings;
  const displayRows = rows.filter((r) => r.spent > 0 || r.monthlyBudget != null);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => setMonth((m) => shiftMonth(m, -1))} hitSlop={10} accessibilityLabel="Previous month">
            <Feather name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
          <Pressable onPress={() => setMonth((m) => shiftMonth(m, 1))} hitSlop={10} accessibilityLabel="Next month">
            <Feather name="chevron-right" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.presetRow}>
          {PRESET_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setPresetKey(key)}
              style={[styles.presetChip, presetKey === key && styles.presetChipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: presetKey === key }}
            >
              <Text style={[styles.presetChipText, presetKey === key && styles.presetChipTextSelected]}>
                {key === 'custom' ? 'Custom' : key}
              </Text>
            </Pressable>
          ))}
        </View>

        {presetKey === 'custom' && (
          <CustomPresetEditor preset={customPreset} onChange={setCustomPreset} />
        )}

        <View style={styles.card}>
          <View style={styles.donutWrap}>
            <Donut
              segments={BUCKETS.map((b) => ({ pct: preset[b], colorIndex: BUCKET_COLOR_INDEX[b] }))}
              centerLabel={formatRupees(totalSpent)}
              centerSubLabel={`of ${formatRupees(income)} planned`}
            />
          </View>

          <View style={styles.bucketList}>
            {BUCKETS.map((b) => (
              <View key={b} style={styles.bucketRow}>
                <View style={styles.bucketHeaderRow}>
                  <View style={styles.bucketNameRow}>
                    <View style={[styles.dot, { backgroundColor: pillPalette[BUCKET_COLOR_INDEX[b]].text }]} />
                    <Text style={styles.bucketName}>{BUCKET_LABEL[b]}</Text>
                    <Text style={styles.bucketPct}>{preset[b]}%</Text>
                  </View>
                  <Text style={styles.bucketAmounts}>
                    {formatRupees(actual[b])} / {formatRupees(planned(income, preset[b]))}
                  </Text>
                </View>
                <ProgressBar spent={actual[b]} budget={planned(income, preset[b])} />
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoryList}>
          {displayRows.length === 0 ? (
            <Text style={styles.noCategoriesText}>No spending yet this month.</Text>
          ) : (
            displayRows.map((row) => <CategoryBudgetCard key={row.id} row={row} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CustomPresetEditor({ preset, onChange }: { preset: Preset; onChange: (p: Preset) => void }) {
  const total = preset.needs + preset.wants + preset.savings;
  const valid = isValidPreset(preset);

  function adjust(bucket: Bucket, delta: number) {
    const next = { ...preset, [bucket]: Math.max(0, Math.min(100, preset[bucket] + delta)) };
    onChange(next);
  }

  return (
    <View style={styles.customCard}>
      {BUCKETS.map((b) => (
        <View key={b} style={styles.stepperRow}>
          <Text style={styles.stepperLabel}>{BUCKET_LABEL[b]}</Text>
          <View style={styles.stepperControls}>
            <Pressable onPress={() => adjust(b, -5)} hitSlop={10} style={styles.stepperButton}>
              <Feather name="minus" size={16} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.stepperValue}>{preset[b]}%</Text>
            <Pressable onPress={() => adjust(b, 5)} hitSlop={10} style={styles.stepperButton}>
              <Feather name="plus" size={16} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>
      ))}
      <Text style={[styles.totalText, !valid && styles.totalTextInvalid]}>
        Total: {total}% {valid ? '' : '— must equal 100%'}
      </Text>
    </View>
  );
}

function CategoryBudgetCard({ row }: { row: CategoryBudgetRow }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.monthlyBudget != null ? String(row.monthlyBudget) : '');

  function commit() {
    const parsed = Number(draft);
    setCategoryBudget(row.id, draft.trim() && !Number.isNaN(parsed) ? parsed : null);
    setEditing(false);
  }

  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryTopRow}>
        <CategoryPill name={row.name} colorIndex={row.colorIndex} />
        <Pressable
          onPress={() => setCategoryBucket(row.id, nextBucket(row.bucket))}
          style={styles.bucketChip}
          accessibilityRole="button"
          accessibilityLabel={`Bucket: ${row.bucket}. Tap to change.`}
        >
          <Text style={styles.bucketChipText}>{BUCKET_LABEL[row.bucket]}</Text>
        </Pressable>
        {editing ? (
          <TextInput
            style={styles.budgetInput}
            value={draft}
            onChangeText={setDraft}
            keyboardType="decimal-pad"
            autoFocus
            onBlur={commit}
            onSubmitEditing={commit}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
          />
        ) : (
          <Pressable onPress={() => setEditing(true)} hitSlop={8}>
            <Text style={styles.budgetText}>
              {row.monthlyBudget != null ? formatRupees(row.monthlyBudget) : 'Set budget'}
            </Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.categorySpent}>
        {formatRupees(row.spent)} spent{row.monthlyBudget != null ? ` of ${formatRupees(row.monthlyBudget)}` : ''}
      </Text>
      <ProgressBar spent={row.spent} budget={row.monthlyBudget ?? 0} />
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
    gap: spacing.lg,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  monthLabel: {
    ...type.h2,
    color: colors.textPrimary,
    minWidth: 160,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  presetChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  presetChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  presetChipText: {
    ...type.label,
    color: colors.textPrimary,
  },
  presetChipTextSelected: {
    color: colors.accentText,
  },
  customCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperLabel: {
    ...type.bodyMedium,
    color: colors.textPrimary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...type.bodyMedium,
    color: colors.textPrimary,
    minWidth: 44,
    textAlign: 'center',
  },
  totalText: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  totalTextInvalid: {
    color: colors.warningText,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.sheet,
    padding: spacing.lg,
    alignItems: 'center',
  },
  donutWrap: {
    marginBottom: spacing.lg,
  },
  bucketList: {
    width: '100%',
    gap: spacing.md,
  },
  bucketRow: {
    gap: spacing.xs,
  },
  bucketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bucketNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  bucketName: {
    ...type.bodyMedium,
    color: colors.textPrimary,
  },
  bucketPct: {
    ...type.caption,
    color: colors.textSecondary,
  },
  bucketAmounts: {
    ...type.caption,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...type.h3,
    color: colors.textPrimary,
  },
  categoryList: {
    gap: spacing.sm,
  },
  noCategoriesText: {
    ...type.body,
    color: colors.textSecondary,
  },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  categoryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bucketChip: {
    backgroundColor: colors.track,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  bucketChipText: {
    ...type.caption,
    color: colors.textPrimary,
  },
  budgetInput: {
    ...type.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  budgetText: {
    ...type.bodyMedium,
    color: colors.accent,
    flex: 1,
    textAlign: 'right',
  },
  categorySpent: {
    ...type.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.pageGutter,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...type.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.lg,
  },
  currency: {
    ...type.amountLg,
    color: colors.textPrimary,
  },
  incomeInput: {
    ...type.amountLg,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderColor: colors.border,
    minWidth: 140,
  },
  emptyButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    ...type.label,
    color: colors.accentText,
  },
});
