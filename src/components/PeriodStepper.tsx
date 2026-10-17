import { Feather } from '@expo/vector-icons';
import React, { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { newestMonthIn, resolvePeriod } from '../data/period';
import { listMonthsWithData } from '../db/queries';
import { useQuery } from '../db/useQuery';
import { spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';
import { useAccountFilter } from './AccountFilter';

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

// ‹ October 2026 › plus a quiet note pointing at where the year is changed.
// No outer spacing: each screen spaces it 16 above and below.
export function PeriodStepper({ onChangeYear }: { onChangeYear: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { period, month, year, older, newer, setPeriod } = usePeriod();
  if (!period) return null;

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
      {/* Top slop stays small so it can't steal taps from the label above. */}
      <Pressable
        onPress={onChangeYear}
        hitSlop={{ top: 6, bottom: 18, left: 24, right: 24 }}
        style={styles.note}
        accessibilityRole="button"
        accessibilityLabel="Change year, opens Filters"
      >
        <Feather name="info" size={12} color={colors.textSecondary} />
        <Text style={styles.noteText}>Change year in Filters</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    wrap: { alignItems: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    label: { ...type.h2, color: colors.textPrimary, minWidth: 160, textAlign: 'center' },
    disabled: { opacity: 0.3 },
    note: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
    noteText: { ...type.caption, color: colors.textSecondary },
  });
