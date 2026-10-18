import { Feather } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { accountLabel, setAccountFilter, useAccountFilter } from '../components/AccountFilter';
import { AppHeader } from '../components/AppHeader';
import { FilterChip } from '../components/FilterChip';
import { PeriodStepper, usePeriod } from '../components/PeriodStepper';
import { PressableScale } from '../components/PressableScale';
import { TransactionRow, TransactionRowData } from '../components/TransactionRow';
import { formatRupees } from '../data/money';
import {
  countInbox,
  countUncategorizedIn,
  getSetting,
  hasAnyTransactions,
  listTransactions,
  TransactionListItem,
  TransactionSort,
} from '../db/queries';
import { UNCATEGORIZED_CATEGORY_ID } from '../db/schema';
import { finalizeTransactions } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { MainTabsParamList, RootStackParamList } from '../navigation/RootNavigator';
import { contentWrap, radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Section = { title: string; data: TransactionListItem[] };

// "Wed 30 Sep": the period above already says the year.
function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  return `${day.toLocaleDateString('en-IN', { weekday: 'short' })} ${day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

function toSections(items: TransactionListItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.data[0].date === item.date) last.data.push(item);
    else sections.push({ title: dayLabel(item.date), data: [item] });
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
    uncategorized: item.categoryId === UNCATEGORIZED_CATEGORY_ID,
    amount: item.deposit ?? item.withdrawal ?? 0,
    kind,
    isTransfer: item.isTransfer,
    date: showDate ? shortDateLabel(item.date) : undefined,
    confirmable: item.categoryId !== UNCATEGORIZED_CATEGORY_ID,
  };
}

function parseAmount(text: string): number | undefined {
  const n = Number(text.replace(/,/g, ''));
  return text.trim() !== '' && Number.isFinite(n) ? n : undefined;
}

// Typing in the amount boxes would otherwise re-run the list query on every keystroke.
function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<MainTabsParamList, 'Transactions'>>();
  const { period, year, years, pickYear } = usePeriod();
  const [view, setView] = useState<'all' | 'byRules'>('all');
  const [direction, setDirection] = useState<'received' | 'sent' | null>(null);
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [sort, setSort] = useState<TransactionSort>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // The "Review" row narrows the list to rows still on Uncategorized.
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const search = useDebounced(searchText).trim();
  const yearScroll = useRef<ScrollView>(null);
  const [minText, setMinText] = useState('');
  const [maxText, setMaxText] = useState('');
  const minAmount = parseAmount(useDebounced(minText));
  const maxAmount = parseAmount(useDebounced(maxText));
  // Home's "Change year in Filters" note lands here with the sheet open.
  const openFilters = route.params?.openFilters;
  useEffect(() => {
    if (openFilters) setFiltersOpen(true);
  }, [openFilters]);

  // Off (Basic): the tab lists every transaction and there is no confirm step.
  const advanced = useQuery(() => getSetting('advanced_access') === '1', []);
  const hasData = useQuery(() => hasAnyTransactions(), []);
  const { accounts, accountId, accountIds } = useAccountFilter();
  const uncategorizedCount = useQuery(() => countUncategorizedIn(period, accountIds), [accountId, period]);
  const counts = useQuery(() => countInbox(period, accountIds), [accountId, period]);
  const items = useQuery(
    () =>
      listTransactions({
        scopeAccountIds: accountIds,
        month: period ?? undefined,
        view: advanced ? view : undefined,
        direction: direction ?? undefined,
        recurringOnly,
        minAmount,
        maxAmount,
        search,
        uncategorizedOnly,
        sort,
      }),
    [accountId, period, advanced, view, direction, recurringOnly, minAmount, maxAmount, search, uncategorizedOnly, sort]
  );

  // Sorting by amount breaks the day grouping, so rows go flat and carry their own date.
  const byDate = sort === 'newest' || sort === 'oldest';
  const sections = useMemo(
    () => (byDate ? toSections(items) : [{ title: '', data: items }]),
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

  const handleConfirm = useCallback((id: string) => finalizeTransactions([id]), []);

  // What the Filters sheet holds (sort counts as one setting); the period lives outside it, in PeriodStepper.
  const filterCount =
    (sort !== 'newest' ? 1 : 0) +
    (direction !== null ? 1 : 0) +
    (recurringOnly ? 1 : 0) +
    (minAmount != null || maxAmount != null ? 1 : 0) +
    (accountId ? 1 : 0);
  const resetFilters = useCallback(() => {
    setSort('newest');
    setDirection(null);
    setRecurringOnly(false);
    setMinText('');
    setMaxText('');
    setAccountFilter(null);
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
      <View style={styles.period}>
        <PeriodStepper
          onChangeYear={() => setFiltersOpen(true)}
          trailing={
            <View style={styles.titleActions}>
              <Pressable
                onPress={() => setSearchOpen((o) => !o)}
                hitSlop={2}
                accessibilityRole="button"
                accessibilityLabel="Search merchants"
                style={[styles.iconButton, (searchOpen || searchText !== '') && styles.iconButtonOn]}
              >
                <Feather name="search" size={18} color={searchOpen || searchText !== '' ? colors.accentText : colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => setFiltersOpen(true)}
                hitSlop={2}
                accessibilityRole="button"
                accessibilityLabel={filterCount ? `Filters, ${filterCount} active` : 'Filters'}
                style={[styles.iconButton, filterCount > 0 && styles.iconButtonOn]}
              >
                <Feather name="sliders" size={18} color={filterCount > 0 ? colors.accentText : colors.textPrimary} />
                {filterCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{filterCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          }
        />
      </View>

      {searchOpen && (
        <View style={styles.searchField}>
          <Feather name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search merchant"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText !== '' && (
            <Pressable onPress={() => setSearchText('')} hitSlop={10} accessibilityLabel="Clear search">
              <Feather name="x" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      )}

      <Text
        style={styles.totalsLine}
        accessibilityLabel={`In ${formatRupees(totals.received)}, out ${formatRupees(totals.sent)}, net ${totals.net < 0 ? 'minus ' : ''}${formatRupees(Math.abs(totals.net))}`}
      >
        In {formatRupees(totals.received)} · Out {formatRupees(totals.sent)} ·{' '}
        <Text style={[styles.totalsNet, totals.net < 0 ? styles.netNegative : styles.netPositive]}>
          Net {totals.net < 0 ? '−' : ''}
          {formatRupees(Math.abs(totals.net))}
        </Text>
      </Text>

      {(uncategorizedCount > 0 || uncategorizedOnly) && (
        <Pressable
          onPress={() => setUncategorizedOnly((v) => !v)}
          style={styles.reviewRow}
          accessibilityRole="button"
          accessibilityLabel={uncategorizedOnly ? 'Show all transactions' : `Review ${uncategorizedCount} uncategorized transactions`}
        >
          <Text style={styles.reviewText}>
            {uncategorizedOnly ? `Showing ${items.length} uncategorized` : `${uncategorizedCount} uncategorized`}
          </Text>
          <Text style={styles.reviewAction}>{uncategorizedOnly ? 'Show all' : 'Review ›'}</Text>
        </Pressable>
      )}

      {advanced && (
        <View style={styles.viewSegment}>
          {([['all', 'All imports', counts.all], ['byRules', 'By rules', counts.byRules]] as const).map(([value, label, n]) => (
            <Pressable
              key={value}
              onPress={() => setView(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: view === value }}
              style={[styles.segmentItem, view === value && styles.segmentItemOn]}
            >
              <Text style={[styles.segmentText, view === value && styles.segmentTextOn]}>
                {label} ({n})
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {advanced && view === 'byRules' && items.length > 0 && (
        <Pressable
          onPress={() => finalizeTransactions(items.map((i) => i.id))}
          style={styles.confirmAll}
          accessibilityRole="button"
        >
          <Feather name="check" size={14} color={colors.accentText} />
          <Text style={styles.confirmAllText}>Confirm all {items.length}</Text>
        </Pressable>
      )}

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {search ? `No matches for "${search}"` : filterCount > 0 ? 'No transactions match these filters' : advanced ? 'All caught up' : 'No transactions here'}
          </Text>
          {advanced && filterCount === 0 && (
            <Text style={styles.emptySubtitle}>
              {counts.all === 0
                ? 'Nothing left to review. Finalized transactions are in Reports.'
                : 'Nothing categorised by a rule here. Switch to All imports.'}
            </Text>
          )}
          {recurringOnly && (
            <Text style={styles.emptySubtitle}>Recurring needs at least two months of statements.</Text>
          )}
          {search !== '' && (
            <PressableScale style={styles.clearButton} onPress={() => setSearchText('')}>
              <Text style={styles.clearButtonText}>Clear search</Text>
            </PressableScale>
          )}
          {filterCount > 0 && (
            <PressableScale style={styles.clearButton} onPress={resetFilters}>
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
              </View>
            ) : null
          }
          renderItem={({ item }) => <TransactionRow data={toRowData(item, !byDate)} onPress={handlePressRow} onConfirm={advanced ? handleConfirm : undefined} />}
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
              {accounts.length > 1 && (
                <>
                  <Text style={[styles.sectionLabel, styles.firstLabel]}>ACCOUNT</Text>
                  {[null, ...accounts].map((a) => (
                    <Pressable
                      key={a?.id ?? 'all'}
                      onPress={() => setAccountFilter(a?.id ?? null)}
                      style={styles.radioRow}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: (a?.id ?? null) === accountId }}
                    >
                      <View style={[styles.radio, (a?.id ?? null) === accountId && styles.radioOn]}>
                        {(a?.id ?? null) === accountId && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioLabel} numberOfLines={1}>
                        {a ? accountLabel(a) : 'All accounts'}
                      </Text>
                    </Pressable>
                  ))}
                </>
              )}
              <Text style={[styles.sectionLabel, accounts.length < 2 && styles.firstLabel]}>YEAR</Text>
              {/* One scrolling line, edge to edge; opens scrolled to the chosen year. */}
              <ScrollView
                ref={yearScroll}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.yearScroll}
                contentContainerStyle={styles.yearRow}
              >
                {years.map((y) => (
                  <View
                    key={y}
                    onLayout={(e) =>
                      y === year &&
                      yearScroll.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - spacing.pageGutter), animated: false })
                    }
                  >
                    <FilterChip label={y} selected={year === y} onPress={() => pickYear(y)} />
                  </View>
                ))}
              </ScrollView>

              <Text style={styles.sectionLabel}>SORT BY</Text>
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
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.pageGutter,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, ...type.body, color: colors.textPrimary, paddingVertical: spacing.sm },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.accentText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...type.caption, fontFamily: 'Inter-Medium', color: colors.accent },
  totalsLine: { ...type.caption, fontSize: 13, color: colors.textSecondary, paddingHorizontal: spacing.pageGutter, paddingTop: spacing.md, paddingBottom: spacing.sm },
  totalsNet: { fontFamily: 'Inter-Medium' },
  netNegative: { color: colors.expenseText },
  netPositive: { color: colors.incomeText },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginHorizontal: spacing.pageGutter,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.card,
  },
  reviewText: { ...type.caption, fontSize: 13, color: colors.textSecondary },
  reviewAction: { ...type.caption, fontSize: 13, fontFamily: 'Inter-Medium', color: colors.accent },
  viewSegment: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: radii.pill, padding: 3, marginHorizontal: spacing.pageGutter, marginBottom: spacing.md },
  confirmAll: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginHorizontal: spacing.pageGutter,
    marginBottom: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  confirmAllText: { ...type.label, color: colors.accentText },
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
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  radioLabel: { ...type.body, color: colors.textPrimary, flex: 1 },
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
  // titleRow already gives 8 above; tiles follow with none of their own on top.
  period: { paddingTop: spacing.sm, paddingBottom: spacing.lg },
  yearScroll: { marginHorizontal: -spacing.pageGutter },
  yearRow: { gap: spacing.sm, paddingHorizontal: spacing.pageGutter },
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
