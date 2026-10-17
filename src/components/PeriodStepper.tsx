import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayRange, daysIn, gapsBetween, monthCoverage, rangeLabel, StatementPeriod } from '../data/coverage';
import { newestMonthIn, resolvePeriod } from '../data/period';
import { listMonthsWithData, listStatements } from '../db/queries';
import { useQuery } from '../db/useQuery';
import { RootStackParamList } from '../navigation/RootNavigator';
import { radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';
import { PressableScale } from './PressableScale';
import { accountLabel, useAccountFilter } from './AccountFilter';

// The one period Home and Transactions share (see resolvePeriod). Held in
// memory, not settings: every launch opens on the newest month.
let choice: string | undefined;
const listeners = new Set<() => void>();
function setChoice(next: string | undefined) {
  choice = next;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePeriod() {
  const current = useSyncExternalStore(subscribe, () => choice);
  const { accountId, accountIds } = useAccountFilter();
  const months = useQuery(() => listMonthsWithData(accountIds, -1), [accountId]);
  return {
    ...resolvePeriod(current, months),
    setPeriod: setChoice,
    pickYear: (year: string) => setChoice(newestMonthIn(year, months)),
  };
}

function label(period: string): string {
  if (period.length === 4) return `All of ${period}`;
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

const shorter = (a: string, b: string) => (b.length < a.length ? b : a);

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Which days of a 'YYYY-MM' month the in-scope statements cover (see
// data/coverage.ts); null for a whole-year period. `coveredLabel` is set only
// when one account is partial, the common case: "1–15 Oct".
export function useCoverage(month: string | null) {
  const { accountId, accountIds } = useAccountFilter();
  const statements = useQuery(() => listStatements(accountIds), [accountId]);
  const periods: StatementPeriod[] = statements.flatMap((s) =>
    s.periodStart && s.periodEnd ? [{ accountId: s.accountId, start: s.periodStart, end: s.periodEnd }] : []
  );
  const coverage = month ? monthCoverage(periods, month, todayIso()) : null;
  const partial = coverage?.accounts.filter((a) => a.missing.length > 0) ?? [];
  // For other months (the Home chart): covered-days label when partial, else undefined.
  const partialLabel = (m: string): string | null | undefined => {
    const accounts = monthCoverage(periods, m, todayIso()).accounts.filter((a) => a.missing.length > 0);
    if (accounts.length === 0) return undefined;
    return accounts.length === 1 ? accounts[0].covered.map(rangeLabel).join(', ') : null;
  };
  return {
    statements,
    periods,
    coverage,
    partialLabel,
    complete: coverage?.complete ?? true,
    // "Covers 1–15 Oct", or "Missing 16–19 Sept" when a hole in the middle makes that shorter.
    coveredLabel: partial.length === 1 ? shorter(`Covers ${partial[0].covered.map(rangeLabel).join(', ')}`, `Missing ${partial[0].missing.map(rangeLabel).join(', ')}`) : null,
    coveredDays: coverage?.accounts.length ? Math.min(...coverage.accounts.map((a) => a.covered.reduce((n, r) => n + daysIn(r), 0))) : 0,
  };
}

// ‹ October 2026 › plus a quiet note: ⓘ opens what's behind the period
// (days covered, days missing, statements), the text opens Filters for the
// year. No outer spacing: each screen spaces it 16 above and below.
export function PeriodStepper({ onChangeYear }: { onChangeYear: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { period, month, year, older, newer, setPeriod } = usePeriod();
  const { complete, coveredLabel } = useCoverage(month);
  const [infoOpen, setInfoOpen] = useState(false);
  if (!period) return null;

  const note = complete ? 'Change year in Filters' : `${coveredLabel ?? 'Some days missing'} · Change year in Filters`;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={() => setPeriod(older)}
          disabled={!older}
          hitSlop={13}
          accessibilityRole="button"
          accessibilityState={{ disabled: !older }}
          accessibilityLabel={month ? 'Older month' : 'Older year'}
          style={!older && styles.disabled}
        >
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => setPeriod(month ? year! : undefined)}
          hitSlop={11}
          accessibilityRole="button"
          accessibilityLabel={month ? 'Show the whole year' : 'Show one month'}
        >
          <Text style={styles.label}>{label(period)}</Text>
        </Pressable>
        <Pressable
          onPress={() => setPeriod(newer)}
          disabled={!newer}
          hitSlop={13}
          accessibilityRole="button"
          accessibilityState={{ disabled: !newer }}
          accessibilityLabel={month ? 'Newer month' : 'Newer year'}
          style={!newer && styles.disabled}
        >
          <Feather name="chevron-right" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
      {/* Two targets side by side; slops stop short of each other and of the label above. */}
      <View style={styles.note}>
        <Pressable
          onPress={() => setInfoOpen(true)}
          hitSlop={{ top: 6, bottom: 18, left: 20, right: 2 }}
          accessibilityRole="button"
          accessibilityLabel={`About ${label(period)}: days covered and statements`}
        >
          <Feather name="info" size={14} color={complete ? colors.textSecondary : colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={onChangeYear}
          hitSlop={{ top: 6, bottom: 18, left: 2, right: 24 }}
          accessibilityRole="button"
          accessibilityLabel={`${note}, opens Filters`}
        >
          <Text style={styles.noteText}>{note}</Text>
        </Pressable>
      </View>
      <PeriodInfo
        visible={infoOpen}
        period={period}
        onClose={() => setInfoOpen(false)}
        onChangeYear={() => {
          setInfoOpen(false);
          onChangeYear();
        }}
      />
    </View>
  );
}

// Everything behind the shown period: per account, the days its statements
// cover and the days missing; then the statements themselves.
function PeriodInfo({
  visible,
  period,
  onClose,
  onChangeYear,
}: {
  visible: boolean;
  period: string;
  onClose: () => void;
  onChangeYear: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accounts } = useAccountFilter();
  const month = period.length === 7 ? period : null;
  const { statements, periods, coverage } = useCoverage(month);

  const first = month ? `${month}-01` : `${period}-01-01`;
  const last = month ? addMonthEnd(month) : `${period}-12-31`;
  const inPeriod = statements.filter((s) => s.periodStart && s.periodEnd && s.periodStart <= last && s.periodEnd >= first);
  const name = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? accountLabel(a) : 'Account';
  };
  // Month: covered / missing per account. Year: the holes between statements.
  const rows = month
    ? (coverage?.accounts ?? []).map((a) => ({ id: a.accountId, covered: a.covered, missing: a.missing }))
    : [...new Set(inPeriod.map((s) => s.accountId))].map((id) => ({
        id,
        covered: [] as DayRange[],
        missing: gapsBetween(periods)
          .filter((g) => g.accountId === id && g.from <= last && g.to >= first)
          .map((g): DayRange => [g.from, g.to]),
      }));
  const anyMissing = rows.some((r) => r.missing.length > 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{label(period)}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody}>
            <Text style={styles.section}>DAYS COVERED</Text>
            {rows.length === 0 && <Text style={styles.body}>No statement covers this {month ? 'month' : 'year'} yet.</Text>}
            {rows.map((r) => (
              <View key={r.id} style={styles.account}>
                <Text style={styles.accountName}>{name(r.id)}</Text>
                {month && <Text style={styles.body}>Covered: {r.covered.map(rangeLabel).join(', ')}</Text>}
                {r.missing.length > 0 ? (
                  <Text style={styles.missing}>Missing: {r.missing.map(rangeLabel).join(', ')}</Text>
                ) : (
                  <Text style={styles.body}>{month ? 'Every day so far is covered.' : 'No gaps between statements.'}</Text>
                )}
              </View>
            ))}

            <Text style={styles.section}>STATEMENTS</Text>
            {inPeriod.length === 0 && <Text style={styles.body}>None imported for this period.</Text>}
            {inPeriod.map((s) => (
              <View key={s.id} style={styles.statement}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>{name(s.accountId)}</Text>
                  <Text style={styles.body}>
                    {rangeLabel([s.periodStart!, s.periodEnd!])} · {s.transactionCount.toLocaleString('en-IN')} transactions
                  </Text>
                </View>
                <Text style={[styles.badge, s.reconciledOk ? styles.badgeOk : styles.badgeWarn]}>
                  {s.reconciledOk ? 'Reconciled' : "Didn't reconcile"}
                </Text>
              </View>
            ))}

            <Text style={styles.hint}>
              Totals only include the days covered. Import the missing days to complete them; transactions you already
              have are skipped.
            </Text>
          </ScrollView>
          <View style={styles.actions}>
            {anyMissing && (
              <PressableScale
                style={styles.primary}
                onPress={() => {
                  onClose();
                  navigation.navigate('Import');
                }}
              >
                <Feather name="upload" size={16} color={colors.accentText} />
                <Text style={styles.primaryText}>Import missing days</Text>
              </PressableScale>
            )}
            <PressableScale style={styles.secondary} onPress={onChangeYear}>
              <Text style={styles.secondaryText}>Change year</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function addMonthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
}

const makeStyles = ({ colors, pillPalette }: Theme) =>
  StyleSheet.create({
    wrap: { alignItems: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    label: { ...type.h2, color: colors.textPrimary, minWidth: 160, textAlign: 'center' },
    disabled: { opacity: 0.3 },
    note: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
    noteText: { ...type.caption, color: colors.textSecondary },
    backdrop: { flex: 1, backgroundColor: 'rgba(20,22,26,0.42)' },
    backdropTap: { flex: 1 },
    sheet: { maxHeight: '80%', backgroundColor: colors.card, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.pageGutter,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    sheetTitle: { ...type.h1, color: colors.textPrimary },
    sheetBody: { paddingHorizontal: spacing.pageGutter, paddingBottom: spacing.md },
    section: { ...type.label, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
    account: { paddingVertical: spacing.sm, gap: 2 },
    accountName: { ...type.label, color: colors.textPrimary },
    body: { ...type.caption, color: colors.textSecondary },
    missing: { ...type.caption, color: colors.expenseText },
    statement: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    badge: { ...type.caption, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, overflow: 'hidden' },
    badgeOk: { backgroundColor: pillPalette[1].bg, color: pillPalette[1].text },
    badgeWarn: { backgroundColor: pillPalette[3].bg, color: pillPalette[3].text },
    hint: { ...type.caption, color: colors.textSecondary, marginTop: spacing.lg },
    actions: { paddingHorizontal: spacing.pageGutter, paddingTop: spacing.md, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    primary: {
      height: 48,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    primaryText: { ...type.label, fontSize: 15, color: colors.accentText },
    secondary: { height: 48, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { ...type.label, fontSize: 15, color: colors.textPrimary },
  });
