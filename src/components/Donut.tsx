import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, pillPalette, type } from '../theme/tokens';

const SIZE = 176;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type DonutSegment = { pct: number; colorIndex: number };

interface DonutProps {
  segments: DonutSegment[]; // needs, wants, savings order — at most 3
  centerLabel: string;
  centerSubLabel: string;
}

// react-native-svg Circles, static (no animation) — a track circle plus
// one per segment, at most 4 shapes total. Center text is a plain RN Text
// overlay, not SVG Text (simpler font handling, same as the rest of the
// app).
export function Donut({ segments, centerLabel, centerSubLabel }: DonutProps) {
  let consumed = 0;

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
          const length = (Math.max(s.pct, 0) / 100) * CIRCUMFERENCE;
          const dashoffset = -consumed;
          consumed += length;
          return (
            <Circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={pillPalette[s.colorIndex].text}
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
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

const styles = StyleSheet.create({
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
