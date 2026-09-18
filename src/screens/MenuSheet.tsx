import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { FilterChip } from '../components/FilterChip';
import { SettingsRow, SettingsSection } from '../components/SettingsRow';
import { getSetting } from '../db/queries';
import { deleteSetting, setSetting } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';
import { contentWrap, radii, spacing, type } from '../theme/tokens';

const APPEARANCES: { value: 'light' | 'dark' | 'system'; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

// Behind the header's menu icon. Profile keeps its own screen; this sheet
// is the index to it, statements history, appearance, the tour, and the
// locked Family entry.
export function MenuSheet() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();
  const appearance = useQuery(() => getSetting('appearance') ?? 'system', []);
  const [familyOpen, setFamilyOpen] = useState(false);

  // replace() closes the sheet and opens the destination in one step.
  const open = (route: 'Profile' | 'Statements') => navigation.replace(route);

  return (
    <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
      <SettingsSection title="Account">
        <SettingsRow
          icon="user"
          label={profile?.fullName ?? 'Profile'}
          value={profile?.email ?? undefined}
          onPress={() => open('Profile')}
        />
      </SettingsSection>

      <SettingsSection title="Data">
        <SettingsRow icon="file-text" label="Statements" onPress={() => open('Statements')} />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <View style={styles.chips}>
          {APPEARANCES.map((a) => (
            <FilterChip
              key={a.value}
              label={a.label}
              selected={appearance === a.value}
              onPress={() => setSetting('appearance', a.value)}
            />
          ))}
        </View>
      </SettingsSection>

      <SettingsSection title="Help">
        <SettingsRow
          icon="compass"
          label="Take the tour"
          showChevron={false}
          onPress={() => {
            deleteSetting('tour_done');
            navigation.goBack();
          }}
        />
      </SettingsSection>

      <SettingsSection title="Coming soon">
        <Pressable
          onPress={() => setFamilyOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: familyOpen }}
        >
          <View style={styles.locked}>
            <SettingsRow icon="lock" label="Family" value="Locked" showChevron={false} />
          </View>
          {familyOpen && (
            <Text style={styles.lockedNote}>
              Share monthly totals with the people you budget with. Statements and transactions stay on each
              phone; only encrypted monthly totals are shared, so we can't read them either.
            </Text>
          )}
          {!familyOpen && (
            <View style={styles.hintRow}>
              <Feather name="info" size={12} color={colors.textSecondary} />
              <Text style={styles.hint}>Tap to see what Family will do</Text>
            </View>
          )}
        </Pressable>
      </SettingsSection>
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    content: {
      padding: spacing.pageGutter,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.xl,
      backgroundColor: colors.background,
    },
    chips: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    locked: {
      opacity: 0.5,
    },
    lockedNote: {
      ...type.caption,
      color: colors.textSecondary,
      paddingBottom: spacing.md,
      borderRadius: radii.card,
    },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingBottom: spacing.sm,
    },
    hint: {
      ...type.caption,
      color: colors.textSecondary,
    },
  });
