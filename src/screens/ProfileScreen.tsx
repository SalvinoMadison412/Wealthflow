import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { colors, radii, spacing, type } from '../theme/tokens';

// No screen.png exists for Profile — styled from DESIGN.md tokens to match
// the rest of the app, not pixel-matched to a source screenshot.
export function ProfileScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Feather name="user" size={28} color={colors.white} />
        </View>
        <Text style={styles.headline}>Profile</Text>
        <Text style={styles.subtitle}>
          Account and preferences will live here once the storage and sync layers are built.
        </Text>
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
    padding: spacing.marginPage,
    alignItems: 'center',
    paddingTop: spacing.stackLg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackMd,
  },
  headline: {
    ...type.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing.stackSm,
  },
  subtitle: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
