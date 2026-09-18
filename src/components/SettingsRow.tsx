import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme/tokens';

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

// The one shared row shape for every settings list on the Profile
// screen — icon, label, optional trailing value, optional chevron.
// Always at least 48dp tall.
export function SettingsRow({ icon, label, value, onPress, destructive, showChevron = true }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.row}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Feather name={icon} size={18} color={destructive ? colors.expenseText : colors.textSecondary} />
      <Text style={[styles.label, destructive && styles.labelDestructive]} numberOfLines={1}>
        {label}
      </Text>
      {value !== undefined && (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      )}
      {showChevron && onPress && <Feather name="chevron-right" size={16} color={colors.border} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: spacing.md,
  },
  label: {
    ...type.body,
    color: colors.textPrimary,
    flex: 1,
  },
  labelDestructive: {
    color: colors.expenseText,
  },
  value: {
    ...type.body,
    color: colors.textSecondary,
  },
});

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>
        {items.map((child, i) => (
          <View key={i} style={i < items.length - 1 ? sectionStyles.divider : undefined}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  title: {
    ...type.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
