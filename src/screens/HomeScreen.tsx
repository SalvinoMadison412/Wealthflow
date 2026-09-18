import { Feather } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { firstName } from '../auth/profile';
import { Amount } from '../components/Amount';
import { AppHeader } from '../components/AppHeader';
import { BarChart } from '../components/BarChart';
import { Donut } from '../components/Donut';
import { PressableScale } from '../components/PressableScale';
import { TransactionRow, TransactionRowData } from '../components/TransactionRow';
import {
  getCurrentMonthSummary,
  getMonthlyTotals,
  hasAnyTransactions,
  listRecentTransactions,
  TransactionListItem,
} from '../db/queries';
import { isStatementStale } from '../data/staleness';
import { listAccounts } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { MainTabsParamList, RootStackParamList } from '../navigation/RootNavigator';
import { colors, contentWrap, pillPalette, radii, spacing, type } from '../theme/tokens';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function toRowData(item: TransactionListItem): TransactionRowData {
  return {
    id: item.id,
    merchant: item.merchant,
    categoryName: item.categoryName,
    colorIndex: item.colorIndex,
    amount: item.deposit ?? item.withdrawal ?? 0,
    kind: item.isTransfer ? 'neutral' : item.deposit != null ? 'income' : 'expense',
    isTransfer: item.isTransfer,
  };
}

const MONTH_NAME = new Date().toLocaleDateString('en-IN', { month: 'long' });

// Sample numbers for the pre-import preview. Fixed figures, real month
// keys, so the empty Home looks like the populated one will.
const SAMPLE_INCOME = 82000;
const SAMPLE_EXPENSE = 63600;
const SAMPLE_MONTHS = [
  [74000, 61200],
  [74000, 68900],
  [79000, 58400],
  [79000, 71100],
  [82000, 66300],
  [SAMPLE_INCOME, SAMPLE_EXPENSE],
].map(([income, expense], i, all) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (all.length - 1 - i));
  return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, income, expense };
});
// Same colour indexes Budget uses for needs / wants / savings.
const SAMPLE_BUCKETS = [
  { label: 'Needs', pct: 52, colorIndex: 0 },
  { label: 'Wants', pct: 29, colorIndex: 5 },
  { label: 'Savings', pct: 19, colorIndex: 1 },
];
const WHY: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'file-text', text: 'Drop in a bank statement PDF. Every transaction is read and categorised for you.' },
  { icon: 'lock', text: 'Everything stays on your phone. Statements are never uploaded.' },
  { icon: 'sliders', text: 'Write a rule once and every future statement sorts itself.' },
];

function ExampleTag() {
  return (
    <View style={styles.exampleTag}>
      <Text style={styles.exampleTagText}>Example</Text>
    </View>
  );
}

// The real dashboard — PR 3/PR 4 had this as a placeholder CTA. See
// docs/REDESIGN_PLAN.md PR 7.
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuth();
  const name = firstName(profile);
  const greeting = name ? `Hi ${name}` : 'Hi there';

  const hasData = useQuery(() => hasAnyTransactions(), []);
  const accounts = useQuery(() => listAccounts(), []);
  // Newest period end across accounts — the "have they updated their
  // statement" signal.
  const latestPeriodEnd = accounts.reduce<string | null>(
    (max, a) => (a.lastImportedPeriodEnd && (!max || a.lastImportedPeriodEnd > max) ? a.lastImportedPeriodEnd : max),
    null
  );
  const stale = isStatementStale(latestPeriodEnd, new Date());
  const summary = useQuery(() => getCurrentMonthSummary(), []);
  const monthly = useQuery(() => getMonthlyTotals(6), []);
  const recent = useQuery(() => listRecentTransactions(5), []);

  const handlePressRow = useCallback(
    (id: string) => navigation.navigate('CategorizeSheet', { transactionId: id }),
    [navigation]
  );

  if (!hasData) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <AppHeader />
        <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.greetingSub}>Import a statement and this is what you'll see.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>NET THIS MONTH</Text>
              <ExampleTag />
            </View>
            <Amount value={SAMPLE_INCOME - SAMPLE_EXPENSE} kind="income" size="lg" />
            <View style={styles.splitRow}>
              <View style={styles.splitItem}>
                <Text style={styles.splitLabel}>Income</Text>
                <Amount value={SAMPLE_INCOME} kind="income" size="sm" />
              </View>
              <View style={styles.splitItem}>
                <Text style={styles.splitLabel}>Expenses</Text>
                <Amount value={SAMPLE_EXPENSE} kind="expense" size="sm" />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>INCOME VS. EXPENSES</Text>
              <ExampleTag />
            </View>
            <BarChart data={SAMPLE_MONTHS} />
          </View>

          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>WHERE IT GOES</Text>
              <ExampleTag />
            </View>
            <View style={styles.donutRow}>
              <Donut
                segments={SAMPLE_BUCKETS.map(({ pct, colorIndex }) => ({ pct, colorIndex }))}
                centerLabel={`₹${SAMPLE_EXPENSE.toLocaleString('en-IN')}`}
                centerSubLabel="spent"
              />
              <View style={styles.legend}>
                {SAMPLE_BUCKETS.map((b) => (
                  <View key={b.label} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: pillPalette[b.colorIndex].text }]} />
                    <Text style={styles.legendText}>{b.label}</Text>
                    <Text style={styles.legendPct}>{b.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.why}>
            {WHY.map((w) => (
              <View key={w.icon} style={styles.whyRow}>
                <Feather name={w.icon} size={16} color={colors.accent} />
                <Text style={styles.whyText}>{w.text}</Text>
              </View>
            ))}
          </View>

          <PressableScale style={styles.cta} onPress={() => navigation.navigate('Import')}>
            <Feather name="upload" size={16} color={colors.accentText} />
            <Text style={styles.ctaText}>Import your first statement</Text>
          </PressableScale>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const net = summary.income - summary.expense;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.greetingSub}>{MONTH_NAME}</Text>
        </View>

        {stale && (
          <View style={styles.nudge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nudgeTitle}>Time to update your statement</Text>
              <Text style={styles.nudgeBody}>
                {latestPeriodEnd
                  ? `Your last statement ended ${new Date(latestPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Import this month's to keep your numbers current.`
                  : 'Import this month’s statement to keep your numbers current.'}
              </Text>
            </View>
            <PressableScale style={styles.nudgeButton} onPress={() => navigation.navigate('Import')}>
              <Feather name="upload" size={14} color={colors.accentText} />
              <Text style={styles.nudgeButtonText}>Import</Text>
            </PressableScale>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>NET THIS MONTH</Text>
          <Amount value={net} kind={net >= 0 ? 'income' : 'expense'} size="lg" />
          <View style={styles.splitRow}>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Income</Text>
              <Amount value={summary.income} kind="income" size="sm" />
            </View>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Expenses</Text>
              <Amount value={summary.expense} kind="expense" size="sm" />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>INCOME VS. EXPENSES</Text>
          <BarChart data={monthly} />
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <PressableScale onPress={() => navigation.navigate('Transactions')} hitSlop={8}>
            <Text style={styles.seeAll}>See all</Text>
          </PressableScale>
        </View>
        <View style={styles.recentCard}>
          {recent.map((item, i) => (
            <React.Fragment key={item.id}>
              <TransactionRow data={toRowData(item)} onPress={handlePressRow} />
              {i < recent.length - 1 && <View style={styles.separator} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.pageGutter,
    // Clears the quick-add FAB, which overhangs the tab bar's top edge.
    paddingBottom: spacing.xxxl + spacing.lg,
    gap: spacing.lg,
  },
  greeting: {
    ...type.h1,
    color: colors.textPrimary,
  },
  greetingSub: {
    ...type.caption,
    color: colors.textSecondary,
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: pillPalette[0].bg,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  nudgeTitle: {
    ...type.h3,
    color: colors.textPrimary,
  },
  nudgeBody: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  nudgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
  },
  nudgeButtonText: {
    ...type.label,
    color: colors.accentText,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.sheet,
    padding: spacing.lg,
  },
  cardLabel: {
    ...type.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginTop: spacing.md,
  },
  splitItem: {
    gap: 2,
  },
  splitLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...type.h3,
    color: colors.textPrimary,
  },
  seeAll: {
    ...type.label,
    color: colors.accent,
  },
  recentCard: {
    backgroundColor: colors.card,
    borderRadius: radii.sheet,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.pageGutter,
  },
  cardLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exampleTag: {
    backgroundColor: pillPalette[9].bg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.sm,
  },
  exampleTagText: {
    ...type.caption,
    color: pillPalette[9].text,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  legend: {
    flex: 1,
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
  legendText: {
    ...type.body,
    color: colors.textPrimary,
    flex: 1,
  },
  legendPct: {
    ...type.amountSm,
    color: colors.textSecondary,
  },
  why: {
    gap: spacing.sm,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  whyText: {
    ...type.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
  },
  ctaText: {
    ...type.bodyMedium,
    color: colors.accentText,
  },
});
