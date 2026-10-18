import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Amount } from './Amount';
import { expenseTone } from '../data/spending';
import { radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles } from '../theme/ThemeContext';

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
// gets to income (data/spending.ts expenseTone). Values show on tap. One
// quiet grey line above the bars says what the newest month with data spent
// as a share of income (trailing months can be empty — see
// data/spending.ts chartEndMonth). No banner and no per-bar warning icons:
// the bars already show it.
// `partial`: months whose statements don't cover every day, mapped to the
// covered days ("1–15 Oct", or null when several accounts differ). Their bars
// are faded, and their line says "so far": a month's verdict waits until it's complete.
export function BarChart({ data, partial = new Map() }: { data: MonthlyBar[]; partial?: Map<string, string | null> }) {
  const styles = useStyles(makeStyles);
  const [selected, setSelected] = useState<number | null>(null);
  const latest = [...data].reverse().find((d) => d.income > 0 || d.expense > 0);
  const latestPartial = latest ? partial.has(latest.month) : false;
  const latestCovered = latest ? partial.get(latest.month) : null;
  const ratio = latest ? expenseTone(latest.income, latest.expense).ratio : null;
  const percent = ratio === null ? null : Math.round(ratio * 100);
  const summary = !latest
    ? null
    : percent === null
      ? `No income in ${fullMonth(latest.month)}`
      : latestPartial
        ? `${fullMonth(latest.month)} so far${latestCovered ? ` (${latestCovered})` : ''}: spent ${percent}% of income`
        : `Spent ${percent}% of income in ${fullMonth(latest.month)}`;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));

  return (
    <View>
      {summary && (
        <Text style={styles.summaryText} accessibilityRole="text">
          {summary}
        </Text>
      )}
      <View style={styles.row}>
        {data.map((d, i) => {
          const isPartial = partial.has(d.month);
          const tone = expenseTone(d.income, d.expense);
          return (
          <Pressable
            key={d.month}
            style={styles.column}
            onPress={() => setSelected((current) => (current === i ? null : i))}
            accessibilityRole="button"
            accessibilityLabel={`${monthLabel(d.month)}${isPartial ? ' (partial month)' : ''}: income ₹${d.income.toFixed(0)}, expenses ₹${d.expense.toFixed(0)}`}
          >
            <View style={[styles.track, isPartial && styles.partial]}>
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
            <Text style={[styles.label, selected === i && styles.labelActive]}>
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

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  row: {
    // Room for the flag icon above the tallest bar, so it never overlaps the card title.
    paddingTop: spacing.lg,
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
  partial: { opacity: 0.45 },
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
  summaryText: {
    ...type.caption,
    fontSize: 13,
    color: colors.textSecondary,
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
