import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Logo } from './Logo';
import { colors, contentWrap, spacing } from '../theme/tokens';

export function AppHeader() {
  return (
    <View style={styles.band}>
      <View style={styles.header}>
        <Feather name="menu" size={22} color={colors.textPrimary} />
        <Logo size={18} color={colors.textPrimary} />
        <Feather name="bell" size={20} color={colors.textSecondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    ...contentWrap,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pageGutter,
    paddingVertical: spacing.md,
  },
});
