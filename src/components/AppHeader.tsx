import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Logo } from './Logo';
import { colors, spacing } from '../theme/tokens';

export function AppHeader() {
  return (
    <View style={styles.header}>
      <Feather name="menu" size={22} color={colors.textPrimary} />
      <Logo size={18} color={colors.textPrimary} />
      <Feather name="bell" size={20} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pageGutter,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
