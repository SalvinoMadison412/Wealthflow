import React from 'react';
import { StyleSheet, View } from 'react-native';

import { progressPercent, progressState } from '../data/budget';
import { colors, radii } from '../theme/tokens';

interface ProgressBarProps {
  spent: number;
  budget: number;
}

// Static, no animation (see docs/REDESIGN_PLAN.md PR 9). Color: accent
// under 80%, warning 80-100%, expense over 100% — progressState owns the
// thresholds, this just renders them.
export function ProgressBar({ spent, budget }: ProgressBarProps) {
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

const styles = StyleSheet.create({
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
