import React from 'react';
import { StyleSheet, View } from 'react-native';

import { progressPercent, progressState } from '../data/budget';
import { radii } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

interface ProgressBarProps {
  spent: number;
  budget: number;
}

// Static, no animation (see docs/REDESIGN_PLAN.md PR 9). Color: accent
// under 80%, warning 80-100%, expense over 100% — progressState owns the
// thresholds, this just renders them.
export function ProgressBar({ spent, budget }: ProgressBarProps) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const state = progressState(spent, budget);
  const pct = progressPercent(spent, budget);
  const fillColor =
    state === 'over' ? colors.expenseFill : state === 'warning' ? colors.warningFill : colors.accent;

  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: Math.max(budget, spent, 1), now: spent }}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
