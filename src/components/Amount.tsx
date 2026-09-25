import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

import { type } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export const formatINR = (value: number) => inr.format(value);

const sizeStyle = { sm: type.amountSm, md: type.amountMd, lg: type.amountLg };
const sign = { income: '+', expense: '−', neutral: '' };

interface AmountProps {
  value: number;
  kind?: 'income' | 'expense' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<TextStyle>;
  /** Shrink to stay on one line (narrow tiles). */
  fit?: boolean;
}

// The one place amounts are formatted: sign, ₹ grouping, and tabular
// figures all live here so every screen's numbers line up and read the
// same way. Never format a rupee amount inline — use this.
export function Amount({ value, kind = 'neutral', size = 'md', style, fit }: AmountProps) {
  const { colors } = useTheme();
  const kindColor = { income: colors.incomeText, expense: colors.expenseText, neutral: colors.textPrimary };
  return (
    <Text
      style={[sizeStyle[size], { color: kindColor[kind], fontVariant: ['tabular-nums'] }, style]}
      maxFontSizeMultiplier={1.3}
      numberOfLines={fit ? 1 : undefined}
      adjustsFontSizeToFit={fit}
    >
      {sign[kind]}
      {inr.format(Math.abs(value))}
    </Text>
  );
}
