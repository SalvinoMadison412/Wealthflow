import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Amount } from './Amount';
import { colors, radii, spacing, type } from '../theme/tokens';

const TRACK_HEIGHT = 96;

type MonthlyBar = { month: string; income: number; expense: number };

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

// Plain Views, no SVG, no animation — paired income/expense bars per
// month. Values are hidden by default and shown for one month at a time
// on tap, never printed permanently (would get noisy at 12 bars).
export function BarChart({ data }: { data: MonthlyBar[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));

  return (
    <View>
      <View style={styles.row}>
        {data.map((d, i) => (
          <Pressable
            key={d.month}
            style={styles.column}
            onPress={() => setSelected((current) => (current === i ? null : i))}
            accessibilityRole="button"
            accessibilityLabel={`${monthLabel(d.month)}: income ₹${d.income.toFixed(0)}, expenses ₹${d.expense.toFixed(0)}`}
          >
            <View style={styles.track}>
              <View style={styles.barPair}>
                <View
                  style={[
                    styles.bar,
                    styles.income,
                    { height: Math.max((d.income / max) * TRACK_HEIGHT, d.income > 0 ? 3 : 0) },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    styles.expense,
                    { height: Math.max((d.expense / max) * TRACK_HEIGHT, d.expense > 0 ? 3 : 0) },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.label, selected === i && styles.labelActive]}>{monthLabel(d.month)}</Text>
          </Pressable>
        ))}
      </View>

      {selected !== null && (
        <View style={styles.tooltip}>
          <View style={styles.tooltipRow}>
            <View style={[styles.dot, styles.income]} />
            <Text style={styles.tooltipLabel}>Income</Text>
            <Amount value={data[selected].income} kind="income" size="sm" />
          </View>
          <View style={styles.tooltipRow}>
            <View style={[styles.dot, styles.expense]} />
            <Text style={styles.tooltipLabel}>Expenses</Text>
            <Amount value={data[selected].expense} kind="expense" size="sm" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'flex-end',
  },
  track: {
    width: '100%',
    height: TRACK_HEIGHT,
    justifyContent: 'flex-end',
  },
  barPair: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 3,
    height: '100%',
  },
  bar: {
    width: 8,
    borderRadius: 3,
  },
  income: {
    backgroundColor: colors.incomeFill,
  },
  expense: {
    backgroundColor: colors.expenseFill,
  },
  label: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  labelActive: {
    color: colors.textPrimary,
  },
  tooltip: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  tooltipLabel: {
    ...type.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});
