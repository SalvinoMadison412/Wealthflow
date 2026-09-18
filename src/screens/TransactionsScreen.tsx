import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount } from '../components/Amount';
import { AppHeader } from '../components/AppHeader';
import { FilterChip } from '../components/FilterChip';
import { PressableScale } from '../components/PressableScale';
import { TransactionRow, TransactionRowData } from '../components/TransactionRow';
import {
  hasAnyTransactions,
  listCategoriesForFilter,
  listMonthsWithData,
  listTransactions,
  TransactionListItem,
} from '../db/queries';
import { listAccounts } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, contentWrap, spacing, type } from '../theme/tokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Section = { title: string; net: number; data: TransactionListItem[] };

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function longDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function toSections(items: TransactionListItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    const net = (item.deposit ?? 0) - (item.withdrawal ?? 0);
    if (last && last.data[0].date === item.date) {
      last.data.push(item);
      last.net += net;
    } else {
      sections.push({ title: longDateLabel(item.date), net, data: [item] });
    }
  }
  return sections;
}

function toRowData(item: TransactionListItem): TransactionRowData {
  const kind = item.isTransfer ? 'neutral' : item.deposit != null ? 'income' : 'expense';
  return {
    id: item.id,
    merchant: item.merchant,
    categoryName: item.categoryName,
    colorIndex: item.colorIndex,
    amount: item.deposit ?? item.withdrawal ?? 0,
    kind,
    isTransfer: item.isTransfer,
  };
}

export function TransactionsScreen() {
  const navigation = useNavigation<Nav>();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);

  const hasData = useQuery(() => hasAnyTransactions(), []);
  const accounts = useQuery(() => listAccounts(), []);
  const months = useQuery(() => listMonthsWithData(), []);
  const categories = useQuery(() => listCategoriesForFilter(), []);
  const items = useQuery(
    () =>
      listTransactions({
        accountId: accountId ?? undefined,
        month: month ?? undefined,
        categoryId: categoryId ?? undefined,
        uncategorizedOnly,
      }),
    [accountId, month, categoryId, uncategorizedOnly]
  );

  const sections = useMemo(() => toSections(items), [items]);

  const handlePressRow = useCallback(
    (id: string) => navigation.navigate('CategorizeSheet', { transactionId: id }),
    [navigation]
  );

  const hasActiveFilters = accountId !== null || month !== null || categoryId !== null || uncategorizedOnly;
  const clearFilters = useCallback(() => {
    setAccountId(null);
    setMonth(null);
    setCategoryId(null);
    setUncategorizedOnly(false);
  }, []);

  if (!hasData) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <AppHeader />
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Feather name="list" size={22} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptySubtitle}>Import a statement to see your transactions here.</Text>
          <PressableScale style={styles.emptyButton} onPress={() => navigation.navigate('Import')}>
            <Feather name="upload" size={16} color={colors.accentText} />
            <Text style={styles.emptyButtonText}>Import a statement</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <Text style={styles.title}>Transactions</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <FilterChip label="Uncategorized only" selected={uncategorizedOnly} onPress={() => {
          setUncategorizedOnly((v) => !v);
          setCategoryId(null);
        }} />
        {accounts.length > 1 && (
          <>
            <FilterChip label="All accounts" selected={accountId === null} onPress={() => setAccountId(null)} />
            {accounts.map((a) => (
              <FilterChip
                key={a.id}
                label={a.bank}
                selected={accountId === a.id}
                onPress={() => setAccountId(a.id)}
              />
            ))}
          </>
        )}
        <FilterChip label="All months" selected={month === null} onPress={() => setMonth(null)} />
        {months.map((m) => (
          <FilterChip key={m} label={monthLabel(m)} selected={month === m} onPress={() => setMonth(m)} />
        ))}
        <FilterChip
          label="All categories"
          selected={categoryId === null && !uncategorizedOnly}
          onPress={() => {
            setCategoryId(null);
            setUncategorizedOnly(false);
          }}
        />
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            label={c.name}
            selected={categoryId === c.id}
            onPress={() => {
              setCategoryId(c.id);
              setUncategorizedOnly(false);
            }}
          />
        ))}
      </ScrollView>

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No transactions match these filters</Text>
          {hasActiveFilters && (
            <PressableScale style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear filters</Text>
            </PressableScale>
          )}
        </View>
      ) : (
        <SectionList
          contentContainerStyle={contentWrap}
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {section.title}
              </Text>
              <Amount value={section.net} kind="neutral" size="sm" />
            </View>
          )}
          renderItem={({ item }) => <TransactionRow data={toRowData(item)} onPress={handlePressRow} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    ...type.h1,
    color: colors.textPrimary,
    paddingHorizontal: spacing.pageGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filterRow: {
    paddingHorizontal: spacing.pageGutter,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.pageGutter,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...type.label,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
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
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
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
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  emptyButtonText: {
    ...type.label,
    color: colors.accentText,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  clearButtonText: {
    ...type.label,
    color: colors.textPrimary,
  },
});
