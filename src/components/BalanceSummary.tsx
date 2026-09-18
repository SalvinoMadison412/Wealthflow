import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getBalanceSummary } from '../db/queries';
import { useQuery } from '../db/useQuery';
import { radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles } from '../theme/ThemeContext';
import { Amount } from './Amount';

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// Opening / inflows / outflows / closing for one month, straight from the
// statement balances. Renders nothing for a month with no transactions.
export function BalanceSummary({ month, accountIds }: { month: string; accountIds: string[] | null }) {
  const styles = useStyles(makeStyles);
  const summary = useQuery(() => getBalanceSummary(month, accountIds), [month, accountIds?.join(',')]);
  if (!summary) return null;

  const tiles = [
    { label: 'Opening balance', value: summary.opening, kind: 'neutral' as const },
    { label: 'Closing balance', value: summary.closing, kind: 'neutral' as const },
    { label: 'Inflows', value: summary.inflows, kind: 'income' as const },
    { label: 'Outflows', value: summary.outflows, kind: 'expense' as const },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.label}>BALANCE · {monthLabel(month).toUpperCase()}</Text>
      <View style={styles.grid}>
        {tiles.map((t) => (
          <View key={t.label} style={styles.tile}>
            <Text style={styles.tileLabel}>{t.label}</Text>
            <Amount value={t.value} kind={t.kind} size="sm" />
          </View>
        ))}
      </View>
      <Text style={styles.note}>Includes transfers between your accounts.</Text>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: { backgroundColor: colors.card, borderRadius: radii.sheet, padding: spacing.lg },
    label: { ...type.label, color: colors.textSecondary, marginBottom: spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
    tile: { width: '50%', gap: 2 },
    tileLabel: { ...type.caption, color: colors.textSecondary },
    note: { ...type.caption, color: colors.textSecondary, marginTop: spacing.md },
  });
