import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, type } from '../theme/tokens';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

// Visually a compact pill, but padded out to a 48dp touch target via
// hitSlop rather than growing the pill itself.
export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
    >
      <Text
        style={[styles.label, selected ? styles.labelSelected : styles.labelUnselected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.accent,
  },
  chipUnselected: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    ...type.label,
    fontSize: 13,
  },
  labelSelected: {
    color: colors.accentText,
  },
  labelUnselected: {
    color: colors.textPrimary,
  },
});
