import React, { useEffect, useReducer, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { cardPlacement } from './placement';
import { getTargetRect, remeasureAll, subscribeTargets, TargetName } from './targets';
import { getSetting } from '../db/queries';
import { setSetting } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';
import { radii, spacing, type } from '../theme/tokens';

const STEPS: { target: TargetName; title: string; text: string }[] = [
  { target: 'greeting', title: 'Your overview', text: 'Your month at a glance lives here once you import a statement.' },
  { target: 'fab', title: 'Import a statement', text: "Tap + and pick a bank statement PDF. It's read on your phone, never uploaded." },
  { target: 'transactionsTab', title: 'Categorise', text: 'Every transaction is listed here. Tap one to give it a category, or turn it into a rule.' },
  { target: 'rulesTab', title: 'Rules', text: 'Rules sort every future statement for you. They run top to bottom; the first match wins.' },
  { target: 'menu', title: 'Menu', text: 'Profile, your statements, appearance and Family are all behind this icon.' },
];

const PAD = 8;
const DIM = 'rgba(0,0,0,0.62)';
const RADIUS = 22;

// Full-screen rectangle with a rounded-rect hole (even-odd fill), so the
// spotlight has soft corners instead of the hard square four flat panels
// would leave. The FAB is round, so its hole is a full circle.
function dimPath(w: number, h: number, hole: { x: number; y: number; w: number; h: number }, r: number) {
  const { x, y } = hole;
  const right = x + hole.w;
  const bottom = y + hole.h;
  return (
    `M0 0H${w}V${h}H0Z ` +
    `M${x + r} ${y}H${right - r}A${r} ${r} 0 0 1 ${right} ${y + r}V${bottom - r}` +
    `A${r} ${r} 0 0 1 ${right - r} ${bottom}H${x + r}A${r} ${r} 0 0 1 ${x} ${bottom - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

// Five spotlight steps over the real Home screen. Shown once per device
// (settings.tour_done); Menu › Take the tour clears that flag to replay.
// All five targets are visible on Home, so the tour never navigates.
export function TourOverlay() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const tourDone = useQuery(() => getSetting('tour_done'), []);
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => subscribeTargets(rerender), []);
  useEffect(() => {
    if (tourDone) {
      setVisible(false);
      return;
    }
    // Let the first layout pass finish before measuring.
    const id = setTimeout(() => {
      remeasureAll();
      setStep(0);
      setVisible(true);
    }, 600);
    return () => clearTimeout(id);
  }, [tourDone]);

  if (!visible) return null;

  const current = STEPS[step];
  const rect = getTargetRect(current.target);
  const hole = rect
    ? { x: rect.x - PAD, y: rect.y - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 }
    : null;
  const placement = rect ? cardPlacement(rect, height) : 'below';
  // The FAB gets a circular spotlight; everything else a rounded rectangle.
  const radius = hole ? (current.target === 'fab' ? Math.min(hole.w, hole.h) / 2 : Math.min(RADIUS, hole.h / 2)) : 0;
  const last = step === STEPS.length - 1;

  const finish = () => {
    setSetting('tour_done', '1');
    setVisible(false);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hole ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Path d={dimPath(width, height, hole, radius)} fill={DIM} fillRule="evenodd" />
          <Rect
            x={hole.x}
            y={hole.y}
            width={hole.w}
            height={hole.h}
            rx={radius}
            ry={radius}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2.5}
          />
        </Svg>
      ) : (
        <View style={[styles.dim, StyleSheet.absoluteFill]} />
      )}

      <View
        style={[
          styles.card,
          { width: Math.min(width - spacing.pageGutter * 2, 420), left: (width - Math.min(width - spacing.pageGutter * 2, 420)) / 2 },
          hole
            ? placement === 'below'
              ? { top: hole.y + hole.h + spacing.lg }
              : { bottom: height - hole.y + spacing.lg }
            : { top: height * 0.4 },
        ]}
      >
        <View style={styles.dots} accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.text}>{current.text}</Text>
        <View style={styles.actions}>
          <Pressable onPress={finish} hitSlop={8} accessibilityRole="button">
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
          <Pressable
            onPress={() => (last ? finish() : setStep(step + 1))}
            style={styles.next}
            accessibilityRole="button"
          >
            <Text style={styles.nextText}>{last ? 'Done' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    dim: { position: 'absolute', backgroundColor: DIM },
    card: {
      position: 'absolute',
      backgroundColor: colors.card,
      borderRadius: 28,
      padding: spacing.xl,
      gap: spacing.xs,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    dots: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotActive: { width: 20, backgroundColor: colors.accent },
    title: { ...type.h2, color: colors.textPrimary },
    text: { ...type.body, color: colors.textSecondary },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
    },
    skip: { ...type.label, color: colors.textSecondary, paddingVertical: spacing.sm },
    next: {
      backgroundColor: colors.accent,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 4,
    },
    nextText: { ...type.label, color: colors.accentText },
  });
