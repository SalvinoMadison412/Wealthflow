import { Feather } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '../components/Amount';
import { AppHeader } from '../components/AppHeader';
import { BarChart } from '../components/BarChart';
import { PressableScale } from '../components/PressableScale';
import { ScopeSwitch } from '../components/ScopeSwitch';
import { TransactionRow, TransactionRowData } from '../components/TransactionRow';
import {
  getAccountIdsForScope,
  getCurrentMonthSummary,
  getMonthlyTotals,
  getOwnerLabels,
  getSetting,
  hasAnyTransactions,
  listRecentTransactions,
  TransactionListItem,
} from '../db/queries';
import { setSetting } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { MainTabsParamList, RootStackParamList } from '../navigation/RootNavigator';
import { colors, contentWrap, radii, spacing, type } from '../theme/tokens';

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

// The real dashboard — PR 3/PR 4 had this as a placeholder CTA. See
// docs/REDESIGN_PLAN.md PR 7.
export function HomeScreen() {
  const navigation = useNavigation<Nav>();

  const hasData = useQuery(() => hasAnyTransactions(), []);
  const ownerLabels = useQuery(() => getOwnerLabels(), []);
  const scope = useQuery(() => getSetting('scope') ?? 'me', []);
  const scopeAccountIds = useQuery(() => getAccountIdsForScope(scope), [scope]);
  const summary = useQuery(() => getCurrentMonthSummary(scopeAccountIds), [scopeAccountIds]);
  const monthly = useQuery(() => getMonthlyTotals(6, scopeAccountIds), [scopeAccountIds]);
  const recent = useQuery(() => listRecentTransactions(5, scopeAccountIds), [scopeAccountIds]);

  const handlePressRow = useCallback(
    (id: string) => navigation.navigate('CategorizeSheet', { transactionId: id }),
    [navigation]
  );

  if (!hasData) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <AppHeader />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No statements imported yet</Text>
          <Text style={styles.emptySubtitle}>Import a statement to see your money at a glance.</Text>
          <PressableScale style={styles.emptyButton} onPress={() => navigation.navigate('Import')}>
            <Feather name="upload" size={16} color={colors.accentText} />
            <Text style={styles.emptyButtonText}>Import statement</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  const net = summary.income - summary.expense;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
        <Text style={styles.greeting}>{MONTH_NAME}</Text>

        <ScopeSwitch scope={scope} onChange={(s) => setSetting('scope', s)} ownerLabels={ownerLabels} />

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
    paddingBottom: spacing.floatingNavClearance,
    gap: spacing.lg,
  },
  greeting: {
    ...type.h1,
    color: colors.textPrimary,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  emptyButtonText: {
    ...type.label,
    color: colors.accentText,
  },
});
