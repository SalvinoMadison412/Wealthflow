import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { pillPalette, radii, type } from '../theme/tokens';

interface CategoryPillProps {
  name: string;
  colorIndex: number;
}

// The one place a category renders as a colored pill — index into the
// deterministic 10-color palette, never an ad hoc color.
export function CategoryPill({ name, colorIndex }: CategoryPillProps) {
  const { bg, text } = pillPalette[((colorIndex % 10) + 10) % 10];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    ...type.label,
    fontSize: 12,
    lineHeight: 16,
  },
});
