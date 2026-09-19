import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Amount } from '../components/Amount';
import { AccountFilter, useAccountFilter } from '../components/AccountFilter';
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
  TransactionSort,
} from '../db/queries';
import { useQuery } from '../db/useQuery';
import { RootStackParamList } from '../navigation/RootNavigator';
import { contentWrap, radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Section = { title: string; net: number; data: TransactionListItem[] };

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
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

const SORT_OPTIONS: [TransactionSort, string][] = [
  ['newest', 'Newest'],
  ['oldest', 'Oldest'],
  ['amountHigh', 'Highest amount'],
  ['amountLow', 'Lowest amount'],
];

function shortDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toRowData(item: TransactionListItem, showDate: boolean): TransactionRowData {
  const kind = item.isTransfer ? 'neutral' : item.deposit != null ? 'income' : 'expense';
  return {
    id: item.id,
    merchant: item.merchant,
    categoryName: item.categoryName,
    colorIndex: item.colorIndex,
    amount: item.deposit ?? item.withdrawal ?? 0,
    kind,
    isTransfer: item.isTransfer,
    date: showDate ? shortDateLabel(item.date) : undefined,
  };
}

function parseAmount(text: string): number | undefined {
  const n = Number(text.replace(/,/g, ''));
  return text.trim() !== '' && Number.isFinite(n) ? n : undefined;
}

export function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  // undefined = newest month with data (follows new imports); 'all' = every month.
  const [monthChoice, setMonthChoice] = useState<string | 'all' | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);
  const [direction, setDirection] = useState<'received' | 'sent' | null>(null);
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [sort, setSort] = useState<TransactionSort>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minText, setMinText] = useState('');
  const [maxText, setMaxText] = useState('');
  const minAmount = parseAmount(minText);
  const maxAmount = parseAmount(maxText);

  const hasData = useQuery(() => hasAnyTransactions(), []);
  const { accountId, accountIds } = useAccountFilter();
  const months = useQuery(() => listMonthsWithData(accountIds), [accountId]);
  const month = monthChoice === 'all' ? null : (monthChoice ?? months[0] ?? null);
  const monthIndex = month ? months.indexOf(month) : -1;
  const categories = useQuery(() => listCategoriesForFilter(), []);
  const items = useQuery(
    () =>
      listTransactions({
        scopeAccountIds: accountIds,
        month: month ?? undefined,
        categoryId: categoryId ?? undefined,
        uncategorizedOnly,
        direction: direction ?? undefined,
        recurringOnly,
        minAmount,
        maxAmount,
        sort,
      }),
    [accountId, month, categoryId, uncategorizedOnly, direction, recurringOnly, minAmount, maxAmount, sort]
  );

  // Sorting by amount breaks the day grouping, so rows go flat and carry their own date.
  const byDate = sort === 'newest' || sort === 'oldest';
  const sections = useMemo(
    () => (byDate ? toSections(items) : [{ title: '', net: 0, data: items }]),
    [items, byDate]
  );
  // Totals follow whatever the filters leave in the list; transfers between
  // accounts are included, as on Home's balance card.
  const totals = useMemo(() => {
    let received = 0;
    let sent = 0;
    for (const i of items) {
      received += i.deposit ?? 0;
      sent += i.withdrawal ?? 0;
    }
    return { received, sent, net: received - sent };
  }, [items]);

  const handlePressRow = useCallback(
    (id: string) => navigation.navigate('CategorizeSheet', { transactionId: id }),
    [navigation]
  );

  // What the Filters sheet holds (sort counts as one setting); the month lives outside it.
  const filterCount =
    (sort !== 'newest' ? 1 : 0) +
    (categoryId !== null || uncategorizedOnly ? 1 : 0) +
    (direction !== null ? 1 : 0) +
    (recurringOnly ? 1 : 0) +
    (minAmount != null || maxAmount != null ? 1 : 0);
  const hasActiveFilters = monthChoice !== undefined || filterCount > 0;
  const resetFilters = useCallback(() => {
    setSort('newest');
    setCategoryId(null);
    setUncategorizedOnly(false);
    setDirection(null);
    setRecurringOnly(false);
    setMinText('');
    setMaxText('');
  }, []);
  const clearFilters = useCallback(() => {
    setMonthChoice(undefined);
    resetFilters();
  }, [resetFilters]);

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
      <AccountFilter />
      <View style={styles.titleRow}>
        <Text style={styles.title}>Transactions</Text>
        <Pressable
          onPress={() => setFiltersOpen(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={filterCount ? `Filters, ${filterCount} active` : 'Filters'}
          style={[styles.filterButton, filterCount > 0 && styles.filterButtonOn]}
        >
          <Feather name="sliders" size={15} color={filterCount > 0 ? colors.accentText : colors.textPrimary} />
          <Text style={[styles.filterButtonText, filterCount > 0 && styles.filterButtonTextOn]}>Filters</Text>
          {filterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setMonthChoice(months[monthIndex + 1])}
          disabled={monthIndex < 0 || monthIndex >= months.length - 1}
          hitSlop={13}
          accessibilityLabel="Older month"
          style={(monthIndex < 0 || monthIndex >= months.length - 1) && styles.chevronDisabled}
        >
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => setMonthChoice(month ? 'all' : undefined)}
          hitSlop={8}
          accessibilityLabel={month ? 'Show all months' : 'Show one month'}
        >
          <Text style={styles.monthLabel}>{month ? monthLabel(month) : 'All months'}</Text>
        </Pressable>
        <Pressable
          onPress={() => setMonthChoice(months[monthIndex - 1])}
          disabled={monthIndex <= 0}
          hitSlop={13}
          accessibilityLabel="Newer month"
          style={monthIndex <= 0 && styles.chevronDisabled}
        >
          <Feather name="chevron-right" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.tiles}>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>Received</Text>
          <Amount value={totals.received} kind="income" size="sm" fit />
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>Sent</Text>
          <Amount value={totals.sent} kind="expense" size="sm" fit />
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>Net</Text>
          <Amount value={totals.net} kind={totals.net >= 0 ? 'income' : 'expense'} size="sm" fit />
        </View>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No transactions match these filters</Text>
          {recurringOnly && (
            <Text style={styles.emptySubtitle}>Recurring needs at least two months of statements.</Text>
          )}
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
          renderSectionHeader={({ section }) =>
            byDate ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} numberOfLines={1}>
                  {section.title}
                </Text>
                <Amount value={section.net} kind="neutral" size="sm" />
              </View>
            ) : null
          }
          renderItem={({ item }) => <TransactionRow data={toRowData(item, !byDate)} onPress={handlePressRow} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={() => setFiltersOpen(false)} accessibilityLabel="Close filters" />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <View style={styles.sheetActions}>
                <Pressable onPress={resetFilters} hitSlop={10} disabled={filterCount === 0}>
                  <Text style={[styles.resetText, filterCount === 0 && styles.resetDisabled]}>Reset</Text>
                </Pressable>
                <Pressable onPress={() => setFiltersOpen(false)} hitSlop={10} accessibilityLabel="Close filters">
                  <Feather name="x" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.sheetBody}>
              <Text style={[styles.sectionLabel, styles.firstLabel]}>SORT BY</Text>
              <View style={styles.chipWrap}>
                {SORT_OPTIONS.map(([value, label]) => (
                  <FilterChip key={value} label={label} selected={sort === value} onPress={() => setSort(value)} />
                ))}
              </View>

              <Text style={styles.sectionLabel}>TYPE</Text>
              <View style={styles.segment}>
                {([[null, 'All'], ['received', 'Received'], ['sent', 'Sent']] as const).map(([value, label]) => (
                  <Pressable
                    key={label}
                    onPress={() => setDirection(value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: direction === value }}
                    style={[styles.segmentItem, direction === value && styles.segmentItemOn]}
                  >
                    <Text style={[styles.segmentText, direction === value && styles.segmentTextOn]}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleTitle}>Recurring only</Text>
                  <Text style={styles.toggleHint}>Needs at least two months of statements</Text>
                </View>
                <Switch
                  value={recurringOnly}
                  onValueChange={setRecurringOnly}
                  trackColor={{ true: colors.accent, false: colors.track }}
                  accessibilityLabel="Recurring only"
                />
              </View>

              <Text style={styles.sectionLabel}>AMOUNT</Text>
              <View style={styles.amountRow}>
                <View style={styles.amountField}>
                  <Text style={styles.amountCurrency}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={minText}
                    onChangeText={setMinText}
                    keyboardType="decimal-pad"
                    placeholder="Min"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <Text style={styles.amountTo}>to</Text>
                <View style={styles.amountField}>
                  <Text style={styles.amountCurrency}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={maxText}
                    onChangeText={setMaxText}
                    keyboardType="decimal-pad"
                    placeholder="Max"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <Text style={styles.sectionLabel}>CATEGORY</Text>
              <View style={styles.chipWrap}>
                <FilterChip
                  label="All"
                  selected={categoryId === null && !uncategorizedOnly}
                  onPress={() => {
                    setCategoryId(null);
                    setUncategorizedOnly(false);
                  }}
                />
                <FilterChip
                  label="Uncategorized only"
                  selected={uncategorizedOnly}
                  onPress={() => {
                    setUncategorizedOnly((v) => !v);
                    setCategoryId(null);
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
              </View>
            </ScrollView>

            <View style={[styles.sheetFooter, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
              <PressableScale style={styles.showButton} onPress={() => setFiltersOpen(false)}>
                <Text style={styles.showButtonText}>
                  Show {items.length} transaction{items.length === 1 ? '' : 's'}
                </Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pageGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { ...type.h1, color: colors.textPrimary },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterButtonText: { ...type.label, color: colors.textPrimary },
  filterButtonTextOn: { color: colors.accentText },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.accentText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...type.caption, fontFamily: 'Inter-Medium', color: colors.accent },
  tiles: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.pageGutter, paddingBottom: spacing.md },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radii.card, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: 2 },
  tileLabel: { ...type.caption, color: colors.textSecondary },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  monthLabel: { ...type.h2, color: colors.textPrimary, minWidth: 160, textAlign: 'center' },
  chevronDisabled: { opacity: 0.3 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amountField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountCurrency: { ...type.body, color: colors.textSecondary },
  amountInput: { flex: 1, ...type.body, color: colors.textPrimary, paddingVertical: spacing.sm, marginLeft: spacing.xs },
  amountTo: { ...type.caption, color: colors.textSecondary },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,22,26,0.42)' },
  backdropTap: { flex: 1 },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pageGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sheetTitle: { ...type.h1, color: colors.textPrimary },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  resetText: { ...type.label, fontSize: 14, color: colors.accent },
  resetDisabled: { opacity: 0.4 },
  sheetBody: { paddingHorizontal: spacing.pageGutter, paddingBottom: spacing.md },
  sectionLabel: { ...type.label, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  firstLabel: { marginTop: spacing.sm },
  segment: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: radii.pill, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.pill },
  segmentItemOn: { backgroundColor: colors.card },
  segmentText: { ...type.label, fontSize: 14, color: colors.textSecondary },
  segmentTextOn: { color: colors.textPrimary },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  toggleText: { flex: 1 },
  toggleTitle: { ...type.body, color: colors.textPrimary },
  toggleHint: { ...type.caption, color: colors.textSecondary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sheetFooter: {
    paddingHorizontal: spacing.pageGutter,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  showButton: {
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showButtonText: { ...type.label, fontSize: 15, color: colors.accentText },
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
