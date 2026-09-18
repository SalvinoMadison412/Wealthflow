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
import { PRESETS } from '../data/budget';
import { isStatementStale } from '../data/staleness';
import { listAccounts } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { MainTabsParamList, RootStackParamList } from '../navigation/RootNavigator';
import { contentWrap, radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

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

// Pre-import Home shows the app's default budget split (a real preset,
// not sample data) and what the app does. No invented figures.
const SPLIT = PRESETS['50/30/20'];
// Same colour indexes Budget uses for needs / wants / savings.
const BUCKETS = [
  { label: 'Needs', pct: SPLIT.needs, colorIndex: 0 },
  { label: 'Wants', pct: SPLIT.wants, colorIndex: 5 },
  { label: 'Savings', pct: SPLIT.savings, colorIndex: 1 },
];
const FEATURES: { icon: keyof typeof Feather.glyphMap; title: string; text: string }[] = [
  { icon: 'file-text', title: 'Import a statement PDF', text: 'Every transaction is read off the page. No manual entry.' },
  { icon: 'tag', title: 'Categorised automatically', text: 'Write a rule once and every future statement sorts itself.' },
  { icon: 'pie-chart', title: 'Needs, wants, savings', text: 'See how your spending splits and set a monthly budget per category.' },
  { icon: 'check-circle', title: 'Checked against your balance', text: 'Each import is reconciled: opening balance plus credits minus debits must equal closing.' },
];

// The real dashboard — PR 3/PR 4 had this as a placeholder CTA. See
// docs/REDESIGN_PLAN.md PR 7.
export function HomeScreen() {
  const { colors, pillPalette } = useTheme();
  const styles = useStyles(makeStyles);
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
            <Text style={styles.greetingSub}>Import a statement to see your money at a glance.</Text>
          </View>

          <View style={styles.safeCard}>
            <View style={styles.safeIcon}>
              <Feather name="lock" size={18} color={colors.incomeText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.safeTitle}>Your data is safe with us.</Text>
              <Text style={styles.safeText}>
                We keep just two things: your sign-in details and the rules you create. Your bank statements,
                transactions and insights live only on this phone, and no AI ever reads them: every transaction is
                sorted by fixed rules, on your device. Delete the app or switch phones and they're gone; re-import
                your statements and your insights come back.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>HOW WE SPLIT YOUR SPENDING</Text>
            <View style={styles.donutRow}>
              <Donut
                segments={BUCKETS.map(({ pct, colorIndex }) => ({ pct, colorIndex }))}
                centerLabel={`${SPLIT.needs}/${SPLIT.wants}/${SPLIT.savings}`}
                centerSubLabel="default split"
              />
              <View style={styles.legend}>
                {BUCKETS.map((b) => (
                  <View key={b.label} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: pillPalette[b.colorIndex].text }]} />
                    <Text style={styles.legendText}>{b.label}</Text>
                    <Text style={styles.legendPct}>{b.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={styles.cardNote}>
              This is how we bifurcate your spending, so you can have a better look at your finances. Change the
              split any time in Budget.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>WHAT WEALTHFLOW DOES</Text>
            <View style={styles.features}>
              {FEATURES.map((f) => (
                <View key={f.icon} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Feather name={f.icon} size={16} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureText}>{f.text}</Text>
                  </View>
                </View>
              ))}
            </View>
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

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
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
  safeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: pillPalette[1].bg,
    borderRadius: radii.sheet,
    padding: spacing.lg,
  },
  safeIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeTitle: {
    ...type.h2,
    color: colors.textPrimary,
  },
  safeText: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
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
  cardNote: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  features: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: pillPalette[0].bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    ...type.bodyMedium,
    color: colors.textPrimary,
  },
  featureText: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
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
