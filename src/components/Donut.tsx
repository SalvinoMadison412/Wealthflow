import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

const SIZE = 176;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type DonutSegment = { pct: number; from: string; to: string };

interface DonutProps {
  segments: DonutSegment[]; // needs, wants, savings order — at most 3
  centerLabel: string;
  centerSubLabel: string;
}

// react-native-svg Circles, static (no animation) — a track circle plus
// one per segment, each stroked with a gradient that runs along its own arc
// (start point to end point, in the circle's rotated frame). Center text is a plain RN Text
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
        <Defs>
          {segments.map((s, i) => {
            const a0 = (starts[i] / CIRCUMFERENCE) * 2 * Math.PI;
            const a1 = ((starts[i] + arc(s)) / CIRCUMFERENCE) * 2 * Math.PI;
            const c = SIZE / 2;
            return (
              <LinearGradient
                key={i}
                id={`arc${i}`}
                gradientUnits="userSpaceOnUse"
                x1={c + RADIUS * Math.cos(a0)}
                y1={c + RADIUS * Math.sin(a0)}
                x2={c + RADIUS * Math.cos(a1)}
                y2={c + RADIUS * Math.sin(a1)}
              >
                <Stop offset="0" stopColor={s.from} />
                <Stop offset="1" stopColor={s.to} />
              </LinearGradient>
            );
          })}
        </Defs>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={pillPalette[9].bg}
          strokeWidth={STROKE}
          fill="none"
        />
        {segments.map((s, i) => {
          const length = arc(s);
          return (
            <Circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={`url(#arc${i})`}
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE}`}
              strokeDashoffset={-starts[i]}
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
