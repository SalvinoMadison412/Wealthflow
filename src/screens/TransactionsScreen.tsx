import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { colors, radii, spacing, type } from '../theme/tokens';

// Placeholder for PR 3 (nav shell) — the real transactions list (grouped
// by date, filter chips, categorize sheet) is PR 5/PR 6. See
// docs/REDESIGN_PLAN.md.
export function TransactionsScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Feather name="list" size={22} color={colors.accent} />
        </View>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>Your imported transactions will show up here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.pageGutter,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...type.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
