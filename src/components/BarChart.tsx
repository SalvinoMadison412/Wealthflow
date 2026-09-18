import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Amount } from './Amount';
import { expenseTone } from '../data/spending';
import { radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

const TRACK_HEIGHT = 96;

type MonthlyBar = { month: string; income: number; expense: number };

function fullMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long' });
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

// Plain Views, no SVG, no animation — paired income/expense bars per
// month. Income is green; the expense bar's red gets louder the closer it
// gets to income (data/spending.ts expenseTone) and a month that spent
// about everything it earned is flagged. Values show on tap. The line
// under the legend describes the last (newest) month.
export function BarChart({ data }: { data: MonthlyBar[] }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const latest = data[data.length - 1];
  const latestTone = latest ? expenseTone(latest.income, latest.expense) : null;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));

  return (
    <View>
      <View style={styles.row}>
        {data.map((d, i) => {
          const tone = expenseTone(d.income, d.expense);
          return (
          <Pressable
            key={d.month}
            style={styles.column}
            onPress={() => setSelected((current) => (current === i ? null : i))}
            accessibilityRole="button"
            accessibilityLabel={`${monthLabel(d.month)}: income ₹${d.income.toFixed(0)}, expenses ₹${d.expense.toFixed(0)}`}
          >
            <View style={styles.track}>
              {tone.flag && (
                <Feather name="alert-triangle" size={12} color={colors.expenseText} style={styles.flagIcon} />
              )}
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
                    {
                      height: Math.max((d.expense / max) * TRACK_HEIGHT, d.expense > 0 ? 3 : 0),
                      opacity: tone.opacity,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.label, selected === i && styles.labelActive, tone.flag && styles.labelFlag]}>
              {monthLabel(d.month)}
            </Text>
          </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={[styles.dot, styles.income]} />
        <Text style={styles.legendText}>Income</Text>
        <View style={[styles.dot, styles.expense]} />
        <Text style={styles.legendText}>Expenses</Text>
      </View>

      {latest && latestTone && (latest.income > 0 || latest.expense > 0) && (
        <View style={[styles.summary, latestTone.flag && styles.summaryFlag]}>
          {latestTone.flag && <Feather name="alert-triangle" size={14} color={colors.expenseText} />}
          <Text style={[styles.summaryText, latestTone.flag && styles.summaryTextFlag]}>
            {latestTone.ratio === null
              ? `Red flag: you spent money in ${fullMonth(latest.month)} with no income coming in.`
              : latestTone.flag
                ? `Red flag: you spent ${Math.round(latestTone.ratio * 100)}% of your income in ${fullMonth(latest.month)}.`
                : `${fullMonth(latest.month)}: you spent ${Math.round(latestTone.ratio * 100)}% of your income.`}
          </Text>
        </View>
      )}

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

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
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
  labelFlag: {
    color: colors.expenseText,
  },
  flagIcon: {
    alignSelf: 'center',
    marginBottom: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  legendText: {
    ...type.caption,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  summaryFlag: {
    backgroundColor: pillPalette[2].bg,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  summaryText: {
    ...type.body,
    color: colors.textPrimary,
    flex: 1,
  },
  summaryTextFlag: {
    color: colors.expenseText,
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
