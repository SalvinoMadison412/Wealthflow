import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, radii, spacing, type } from '../theme/tokens';

// react-native-svg is already a project dependency (used elsewhere for
// vector art) — a true pie chart needs arc drawing, which realistically
// means this, not a from-scratch canvas.
const SHADES = [
  colors.onSurface,
  colors.onSurfaceVariant,
  colors.outline,
  colors.surfaceContainerHighest,
  colors.surfaceContainerHigh,
  colors.surfaceContainer,
];

const SIZE = 160;
const RADIUS = SIZE / 2;

function polarToCartesian(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: RADIUS + RADIUS * Math.cos(rad), y: RADIUS + RADIUS * Math.sin(rad) };
}

function arcPath(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(endAngle);
  const end = polarToCartesian(startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${RADIUS} ${RADIUS} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function PieChart({ segments }: { segments: { label: string; value: number }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let angle = 0;

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {total <= 0 ? (
          <Circle cx={RADIUS} cy={RADIUS} r={RADIUS} fill={colors.surfaceContainer} />
        ) : segments.length === 1 ? (
          <Circle cx={RADIUS} cy={RADIUS} r={RADIUS} fill={SHADES[0]} />
        ) : (
          segments.map((s, i) => {
            const sweep = (s.value / total) * 360;
            const path = arcPath(angle, angle + sweep);
            angle += sweep;
            return (
              <Path key={s.label} d={path} fill={SHADES[i % SHADES.length]} stroke={colors.background} strokeWidth={2} />
            );
          })
        )}
      </Svg>

      <View style={styles.legend}>
        {segments.map((s, i) => (
          <View key={s.label} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: SHADES[i % SHADES.length] }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={styles.legendValue}>₹{Math.round(s.value)}</Text>
            <Text style={styles.legendPercent}>
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.stackMd,
  },
  legend: {
    width: '100%',
    gap: spacing.stackSm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: radii.sm,
  },
  legendLabel: {
    ...type.bodyMd,
    fontSize: 14,
    color: colors.onSurface,
    flex: 1,
  },
  legendValue: {
    ...type.numeral,
    fontSize: 14,
    color: colors.onSurface,
  },
  legendPercent: {
    ...type.labelSm,
    color: colors.onSurfaceVariant,
    width: 36,
    textAlign: 'right',
  },
});
