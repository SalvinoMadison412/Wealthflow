import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

export type DetailRow = { label: string; value: string };

// The fields read off the statement, one tap to copy each (or all of them).
export function TransactionDetails({ rows }: { rows: DetailRow[] }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function copy(key: string, text: string) {
    Clipboard.setStringAsync(text);
    setCopied(key);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1200);
  }

  return (
    <View style={styles.card}>
      {rows.map((r) => (
        <Pressable
          key={r.label}
          onPress={() => copy(r.label, r.value)}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={`Copy ${r.label}`}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{r.label}</Text>
            <Text style={styles.value}>{r.value}</Text>
          </View>
          {copied === r.label ? (
            <Text style={styles.copied}>Copied</Text>
          ) : (
            <Feather name="copy" size={15} color={colors.textSecondary} />
          )}
        </Pressable>
      ))}
      <Pressable
        onPress={() => copy('all', rows.map((r) => `${r.label}: ${r.value}`).join('\n'))}
        style={styles.copyAll}
        accessibilityRole="button"
      >
        <Feather name={copied === 'all' ? 'check' : 'copy'} size={14} color={colors.accent} />
        <Text style={styles.copyAllText}>{copied === 'all' ? 'Copied' : 'Copy all'}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.track,
      borderRadius: radii.card,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    label: { ...type.caption, color: colors.textSecondary },
    value: { ...type.body, color: colors.textPrimary },
    copied: { ...type.label, color: colors.accent },
    copyAll: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingTop: spacing.md,
    },
    copyAllText: { ...type.label, color: colors.accent },
  });
