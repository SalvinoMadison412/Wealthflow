import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { PressableScale } from '../components/PressableScale';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, radii, spacing, type } from '../theme/tokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Placeholder for PR 3 (nav shell) — the real dashboard (net this month,
// income/expense chart, recent transactions) is PR 7. See
// docs/REDESIGN_PLAN.md.
export function HomeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.headline}>The Mirror</Text>
          <Text style={styles.subtitle}>
            Reflect on your financial reality. Import a statement to begin the analysis.
          </Text>
        </View>

        <PressableScale style={styles.importCard} onPress={() => navigation.navigate('Import')}>
          <View style={styles.importIconWrap}>
            <Feather name="upload" size={22} color={colors.accentText} />
          </View>
          <Text style={styles.importTitle}>Import a statement</Text>
          <Text style={styles.importSubtitle}>PDF or CSV, parsed entirely on this device</Text>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.pageGutter,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  headline: {
    ...type.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  importCard: {
    backgroundColor: colors.accent,
    borderRadius: radii.sheet,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  importIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.card,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  importTitle: {
    ...type.h2,
    color: colors.accentText,
    marginBottom: 4,
  },
  importSubtitle: {
    ...type.caption,
    color: colors.accentText,
    opacity: 0.85,
    textAlign: 'center',
  },
});
