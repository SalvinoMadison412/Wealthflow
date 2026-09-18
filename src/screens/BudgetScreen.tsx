import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { colors, radii, spacing, type } from '../theme/tokens';

// Placeholder for PR 3 (nav shell) — the real budget planner (60/20/20
// donut, per-category progress bars) is PR 9. See docs/REDESIGN_PLAN.md.
export function BudgetScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Feather name="pie-chart" size={22} color={colors.accent} />
        </View>
        <Text style={styles.title}>Budget</Text>
        <Text style={styles.subtitle}>Plan how your spending should be split once you have data.</Text>
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
