import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme/tokens';

const TRACK_HEIGHT = 120;

// Zero-dependency bar chart: bars are just Views sized by flex/height
// proportional to value. No color-by-series — every bar is the same
// monochrome fill, and the value itself is printed above each bar.
export function BarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <View style={styles.row}>
      {bars.map((b) => (
        <View key={b.label} style={styles.col}>
          <Text style={styles.value} numberOfLines={1}>
            {b.value > 0 ? Math.round(b.value) : ''}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                { height: Math.max((b.value / max) * TRACK_HEIGHT, b.value > 0 ? 4 : 0) },
              ]}
            />
          </View>
          <Text style={styles.label}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    ...type.numeral,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
    height: 14,
  },
  track: {
    width: '100%',
    height: TRACK_HEIGHT,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: colors.onSurface,
    borderRadius: radii.sm,
  },
  label: {
    ...type.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.stackSm,
  },
});
