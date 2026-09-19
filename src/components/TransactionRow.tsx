import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Amount } from './Amount';
import { CategoryPill } from './CategoryPill';
import { spacing, type } from '../theme/tokens';
import { Theme, useStyles } from '../theme/ThemeContext';

export interface TransactionRowData {
  id: string;
  merchant: string;
  categoryName: string;
  colorIndex: number;
  amount: number;
  kind: 'income' | 'expense' | 'neutral';
  isTransfer: boolean;
  /** Shown beside the category when rows aren't grouped under date headers. */
  date?: string;
}

interface TransactionRowProps {
  data: TransactionRowData;
  onPress: (id: string) => void;
}

const SIGN_WORD = { income: 'plus', expense: 'minus', neutral: '' };

// React.memo + primitive-only data + a stable onPress (useCallback at the
// screen level) — the pattern that keeps a long SectionList from
// re-rendering every row when one row's category changes.
function TransactionRowBase({ data, onPress }: TransactionRowProps) {
  const styles = useStyles(makeStyles);
  const spokenAmount = `${SIGN_WORD[data.kind]} ₹${Math.abs(data.amount).toFixed(2)} rupees`.trim();

  return (
    <Pressable
      onPress={() => onPress(data.id)}
      style={styles.row}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${data.merchant}, ${data.categoryName}, ${spokenAmount}`}
    >
      <View style={styles.info} importantForAccessibility="no-hide-descendants">
        <Text style={styles.merchant} numberOfLines={1}>
          {data.merchant}
        </Text>
        <View style={styles.meta}>
          <CategoryPill name={data.categoryName} colorIndex={data.colorIndex} />
          {data.date != null && <Text style={styles.date}>{data.date}</Text>}
        </View>
      </View>
      <Amount value={data.amount} kind={data.kind} size="sm" />
    </Pressable>
  );
}

export const TransactionRow = React.memo(TransactionRowBase);

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.pageGutter,
    backgroundColor: colors.card,
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  date: { ...type.caption, color: colors.textSecondary },
  merchant: {
    ...type.bodyMedium,
    color: colors.textPrimary,
  },
});
