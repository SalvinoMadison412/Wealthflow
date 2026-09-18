import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { CategoryPill } from '../components/CategoryPill';
import { Donut } from '../components/Donut';
import { PressableScale } from '../components/PressableScale';
import { ProgressBar } from '../components/ProgressBar';
import {
  CategoryBudgetRow,
  countTransactionsInMonth,
  countUncategorized,
  getCategoryBudgetRows,
  getSetting,
  listMonthsWithData,
} from '../db/queries';
import { parseMonths } from '../data/decategorize';
import { topWithOthers } from '../data/spending';
import { DECATEGORIZED_MONTHS_SETTING } from '../db/recategorize';
import { decategorizeMonth, enableAutoCategorise, setCategoryBudget } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { contentWrap, radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

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

export function BudgetScreen() {
  const { colors, pillPalette } = useTheme();
  const styles = useStyles(makeStyles);
  // Opens on the newest month that has data — the current calendar month is
  // usually empty, and the numbers the user just imported are the point.
  const [month, setMonth] = useState(() => listMonthsWithData()[0] ?? currentMonthKey());
  const rows = useQuery(() => getCategoryBudgetRows(month), [month]);
  const uncategorizedCount = useQuery(() => countUncategorized(), []);
  const monthHasData = useQuery(() => countTransactionsInMonth(month) > 0, [month]);
  const decategorized = useQuery(() => parseMonths(getSetting(DECATEGORIZED_MONTHS_SETTING)).includes(month), [month]);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);

  function autoCategorize() {
    const categorised = enableAutoCategorise(month);
    setAutoMessage(
      categorised === 0
        ? 'Nothing new matched. Add a rule for the rest.'
        : `Categorised ${categorised} transaction${categorised === 1 ? '' : 's'}.`
    );
  }

  const spending = rows.filter((r) => r.spent > 0).sort((a, b) => b.spent - a.spent);
  const totalSpent = spending.reduce((sum, r) => sum + r.spent, 0);
  const displayRows = [...spending, ...rows.filter((r) => r.spent === 0 && r.monthlyBudget != null)];
  // Top 4 keep their own color and a label; the rest share one grey
  // "Others" slice. The list below still shows every category.
  const { top, othersSpent } = topWithOthers(spending, 4);
  const legend = [
    ...top.map((r) => ({ key: r.id, name: r.name, spent: r.spent, color: pillPalette[r.colorIndex].text })),
    ...(othersSpent > 0 ? [{ key: 'others', name: 'Others', spent: othersSpent, color: colors.textSecondary }] : []),
  ];
  const monthName = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long' });

  function confirmDecategorize() {
    Alert.alert(
      `Decategorize ${monthName}?`,
      `All ${countTransactionsInMonth(month)} transactions go back to Uncategorized, including ones you set by hand. Your own rules still apply.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decategorize',
          style: 'destructive',
          onPress: () => {
            decategorizeMonth(month);
            setAutoMessage(null);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => setMonth((m) => shiftMonth(m, -1))} hitSlop={13} accessibilityLabel="Previous month">
            <Feather name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
          <Pressable onPress={() => setMonth((m) => shiftMonth(m, 1))} hitSlop={13} accessibilityLabel="Next month">
            <Feather name="chevron-right" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.donutWrap}>
            <Donut
              segments={
                monthHasData && totalSpent > 0
                  ? legend.map((l) => ({ pct: (l.spent / totalSpent) * 100, color: l.color }))
                  : []
              }
              centerLabel={monthHasData ? formatRupees(totalSpent) : 'No statement'}
              centerSubLabel={monthHasData ? `spent in ${monthName}` : monthLabel(month)}
            />
          </View>
          {monthHasData && totalSpent > 0 && (
            <View style={styles.legend}>
              {legend.map((l) => (
                <View key={l.key} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                  <Text style={styles.legendName} numberOfLines={1}>{l.name}</Text>
                  <Text style={styles.legendValue}>
                    {formatRupees(l.spent)} · {Math.round((l.spent / totalSpent) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {(uncategorizedCount > 0 || autoMessage || decategorized) && (
          <View style={styles.autoCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoTitle}>
                {decategorized
                  ? `${monthName} is decategorized`
                  : uncategorizedCount > 0
                    ? `${uncategorizedCount} uncategorised`
                    : 'All categorised'}
              </Text>
              <Text style={styles.autoText}>
                {decategorized
                  ? 'Add your own rules, or Auto-categorise to undo.'
                  : (autoMessage ?? 'Swiggy, Rapido, Blinkit, DMart and more, sorted in one tap.')}
              </Text>
            </View>
            {(uncategorizedCount > 0 || decategorized) && (
              <PressableScale style={styles.autoButton} onPress={autoCategorize}>
                <Feather name="zap" size={14} color={colors.accentText} />
                <Text style={styles.autoButtonText}>Auto-categorise</Text>
              </PressableScale>
            )}
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {monthHasData && !decategorized && (
            <Pressable onPress={confirmDecategorize} hitSlop={8} accessibilityRole="button">
              <Text style={styles.decategorizeText}>Decategorize {monthName}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.categoryList}>
          {displayRows.length === 0 ? (
            <Text style={styles.noCategoriesText}>No spending yet this month.</Text>
          ) : (
            displayRows.map((row) => <CategoryBudgetCard key={row.id} row={row} totalSpent={totalSpent} />)
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

function CategoryBudgetCard({ row, totalSpent }: { row: CategoryBudgetRow; totalSpent: number }) {
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
          <Pressable onPress={() => setEditing(true)} hitSlop={8} style={styles.budgetButton}>
            <Feather name="edit-2" size={12} color={colors.accent} />
            <Text style={styles.budgetText}>
              {row.monthlyBudget != null ? formatRupees(row.monthlyBudget) : 'Budget'}
            </Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.categorySpent}>
        {formatRupees(row.spent)} spent
        {row.monthlyBudget != null ? ` of ${formatRupees(row.monthlyBudget)}` : ''}
        {` · ${row.txCount} transaction${row.txCount === 1 ? '' : 's'}`}
        {totalSpent > 0 && row.spent > 0 ? ` · ${Math.round((row.spent / totalSpent) * 100)}%` : ''}
      </Text>
      {row.monthlyBudget != null && <ProgressBar spent={row.spent} budget={row.monthlyBudget} />}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.sheet,
    padding: spacing.lg,
    alignItems: 'center',
  },
  donutWrap: {
    marginBottom: spacing.lg,
  },
  legend: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
  },
  legendName: {
    ...type.body,
    color: colors.textPrimary,
    flex: 1,
  },
  legendValue: {
    ...type.caption,
    color: colors.textSecondary,
  },
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  decategorizeText: {
    ...type.caption,
    color: colors.textSecondary,
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
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  budgetInput: {
    ...type.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  budgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  budgetText: {
    ...type.caption,
    color: colors.accent,
  },
  categorySpent: {
    ...type.caption,
    color: colors.textSecondary,
  },
});
