import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { CategoryPill } from '../components/CategoryPill';
import { BalanceSummary } from '../components/BalanceSummary';
import { Donut } from '../components/Donut';
import { PressableScale } from '../components/PressableScale';
import { ProgressBar } from '../components/ProgressBar';
import { Bucket, bucketTotals, isValidPreset, planned, Preset, PRESETS } from '../data/budget';
import {
  CategoryBudgetRow,
  countTransactionsInMonth,
  countUncategorized,
  getCategoryBudgetRows,
  getIncomeForMonth,
  getSetting,
  listMonthsWithData,
} from '../db/queries';
import { applyPresetRules, setCategoryBucket, setCategoryBudget, setSetting } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { bucketColors, contentWrap, radii, spacing, type } from '../theme/tokens';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

const BUCKETS: Bucket[] = ['needs', 'savings'];
const BUCKET_LABEL: Record<Bucket, string> = { needs: 'Needs', savings: 'Savings' };
const PRESET_KEYS: ('80/20' | '70/30' | 'custom')[] = ['80/20', '70/30', 'custom'];

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
  const { colors, pillPalette } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Opens on the newest month that has data — the current calendar month is
  // usually empty, and the numbers the user just imported are the point.
  const [month, setMonth] = useState(() => listMonthsWithData()[0] ?? currentMonthKey());
  const [presetKey, setPresetKey] = useState<'80/20' | '70/30' | 'custom'>('80/20');
  const [customPreset, setCustomPreset] = useState<Preset>({ needs: 75, savings: 25 });
  const [incomeInput, setIncomeInput] = useState('');

  const realIncome = useQuery(() => getIncomeForMonth(month), [month]);
  const incomeSetting = useQuery(() => getSetting('monthly_income'), []);
  const rows = useQuery(() => getCategoryBudgetRows(month), [month]);
  const uncategorizedCount = useQuery(() => countUncategorized(), []);
  const [emptyMonth, setEmptyMonth] = useState<string | null>(null);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);

  const income = realIncome > 0 ? realIncome : Number(incomeSetting ?? 0);
  const preset = presetKey === 'custom' ? customPreset : PRESETS[presetKey];

  function stepMonth(delta: number) {
    const next = shiftMonth(month, delta);
    setMonth(next);
    setEmptyMonth(countTransactionsInMonth(next) > 0 ? null : next);
  }

  function autoCategorize() {
    const { rulesAdded, categorised } = applyPresetRules();
    setAutoMessage(
      rulesAdded === 0 && categorised === 0
        ? 'Nothing new matched. Add a rule for the rest.'
        : `Categorised ${categorised} transaction${categorised === 1 ? '' : 's'} · ${rulesAdded} rule${rulesAdded === 1 ? '' : 's'} added (see Rules)`
    );
  }

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
  const totalSpent = actual.needs + actual.savings;
  const displayRows = rows.filter((r) => r.spent > 0 || r.monthlyBudget != null);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => stepMonth(-1)} hitSlop={13} accessibilityLabel="Previous month">
            <Feather name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
          <Pressable onPress={() => stepMonth(1)} hitSlop={13} accessibilityLabel="Next month">
            <Feather name="chevron-right" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <BalanceSummary month={month} />

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
              segments={BUCKETS.map((b) => ({ pct: preset[b], color: bucketColors[b] }))}
              centerLabel={formatRupees(totalSpent)}
              centerSubLabel={`of ${formatRupees(income)} planned`}
            />
          </View>

          <View style={styles.bucketList}>
            {BUCKETS.map((b) => (
              <View key={b} style={styles.bucketRow}>
                <View style={styles.bucketHeaderRow}>
                  <View style={styles.bucketNameRow}>
                    <View style={[styles.dot, { backgroundColor: bucketColors[b] }]} />
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

        {(uncategorizedCount > 0 || autoMessage) && (
          <View style={styles.autoCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoTitle}>
                {uncategorizedCount > 0 ? `${uncategorizedCount} uncategorised` : 'All categorised'}
              </Text>
              <Text style={styles.autoText}>
                {autoMessage ?? 'Swiggy, Rapido, Blinkit, DMart and more, sorted in one tap.'}
              </Text>
            </View>
            {uncategorizedCount > 0 && (
              <PressableScale style={styles.autoButton} onPress={autoCategorize}>
                <Feather name="zap" size={14} color={colors.accentText} />
                <Text style={styles.autoButtonText}>Auto-categorise</Text>
              </PressableScale>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoryList}>
          {displayRows.length === 0 ? (
            <Text style={styles.noCategoriesText}>No spending yet this month.</Text>
          ) : (
            displayRows.map((row) => <CategoryBudgetCard key={row.id} row={row} />)
          )}
        </View>
      </ScrollView>

      <Modal visible={emptyMonth !== null} transparent animationType="fade" onRequestClose={() => setEmptyMonth(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEmptyMonth(null)}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <View style={styles.dialogIcon}>
              <Feather name="file-text" size={22} color={colors.accent} />
            </View>
            <Text style={styles.dialogTitle}>No statement for {emptyMonth ? monthLabel(emptyMonth) : ''}</Text>
            <Text style={styles.dialogText}>
              You don't have a statement assigned to this month. Import one to see your split and category spending.
            </Text>
            <PressableScale
              style={styles.dialogPrimary}
              onPress={() => {
                setEmptyMonth(null);
                navigation.navigate('Import');
              }}
            >
              <Feather name="upload" size={16} color={colors.accentText} />
              <Text style={styles.dialogPrimaryText}>Import a statement</Text>
            </PressableScale>
            <Pressable onPress={() => setEmptyMonth(null)} hitSlop={8} style={styles.dialogSecondary}>
              <Text style={styles.dialogSecondaryText}>Not now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function CustomPresetEditor({ preset, onChange }: { preset: Preset; onChange: (p: Preset) => void }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const total = preset.needs + preset.savings;
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
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
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

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.pageGutter,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  dialogIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: pillPalette[1].bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  dialogTitle: { ...type.h2, color: colors.textPrimary, textAlign: 'center' },
  dialogText: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
  dialogPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  dialogPrimaryText: { ...type.label, color: colors.accentText },
  dialogSecondary: { paddingVertical: spacing.sm },
  dialogSecondaryText: { ...type.label, color: colors.textSecondary },
  autoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: pillPalette[1].bg,
    borderRadius: radii.sheet,
    padding: spacing.md,
  },
  autoTitle: { ...type.label, color: colors.textPrimary },
  autoText: { ...type.caption, color: colors.textSecondary },
  autoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  autoButtonText: { ...type.label, color: colors.accentText },
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
