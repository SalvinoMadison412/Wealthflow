import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

const SIZE = 176;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3;

type DonutSegment = { pct: number; color: string };

interface DonutProps {
  segments: DonutSegment[]; // drawn clockwise from 12 o'clock, in array order
  centerLabel: string;
  centerSubLabel: string;
}

// react-native-svg Circles, static (no animation) — a track circle plus
// one per segment (Budget passes at most 5). Center text is a plain RN Text
// overlay, not SVG Text (simpler font handling, same as the rest of the
// app).
export function Donut({ segments, centerLabel, centerSubLabel }: DonutProps) {
  const { pillPalette } = useTheme();
  const styles = useStyles(makeStyles);
  const arc = (s: DonutSegment) => (Math.max(s.pct, 0) / 100) * CIRCUMFERENCE;
  const starts = segments.map((_, i) => segments.slice(0, i).reduce((sum, s) => sum + arc(s), 0));

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={pillPalette[9].bg}
          strokeWidth={STROKE}
          fill="none"
        />
        {segments.map((s, i) => {
          // A small gap between slices; round caps would overlap once
          // there are more than a few categories.
          const length = segments.length > 1 ? Math.max(arc(s) - GAP, 0) : arc(s);
          return (
            <Circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE}`}
              strokeDashoffset={-starts[i]}
              fill="none"
              // rotate(-90) starts each arc at 12 o'clock instead of 3.
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          );
        })}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerLabel} numberOfLines={1} adjustsFontSizeToFit>
          {centerLabel}
        </Text>
        <Text style={styles.centerSubLabel} numberOfLines={1}>
          {centerSubLabel}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    maxWidth: SIZE - STROKE * 2,
  },
  centerLabel: {
    ...type.h3,
    color: colors.textPrimary,
  },
  centerSubLabel: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
