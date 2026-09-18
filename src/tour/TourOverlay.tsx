import React, { useEffect, useReducer, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { cardPlacement } from './placement';
import { getTargetRect, remeasureAll, subscribeTargets, TargetName } from './targets';
import { getSetting } from '../db/queries';
import { setSetting } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { Theme, useStyles } from '../theme/ThemeContext';
import { radii, spacing, type } from '../theme/tokens';

const STEPS: { target: TargetName; title: string; text: string }[] = [
  { target: 'greeting', title: 'Your overview', text: 'Your month at a glance lives here once you import a statement.' },
  { target: 'fab', title: 'Import a statement', text: "Tap + and pick a bank statement PDF. It's read on your phone, never uploaded." },
  { target: 'transactionsTab', title: 'Categorise', text: 'Every transaction is listed here. Tap one to give it a category, or turn it into a rule.' },
  { target: 'rulesTab', title: 'Rules', text: 'Rules sort every future statement for you. They run top to bottom; the first match wins.' },
  { target: 'menu', title: 'Menu', text: 'Profile, your statements, appearance and Family are all behind this icon.' },
];

const PAD = 8;
const DIM = 'rgba(0,0,0,0.6)';

// Five spotlight steps over the real Home screen. Shown once per device
// (settings.tour_done); Menu › Take the tour clears that flag to replay.
// All five targets are visible on Home, so the tour never navigates.
export function TourOverlay() {
  const styles = useStyles(makeStyles);
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
  const last = step === STEPS.length - 1;

  const finish = () => {
    setSetting('tour_done', '1');
    setVisible(false);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hole ? (
        <>
          <View style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(hole.y, 0) }]} />
          <View style={[styles.dim, { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]} />
          <View style={[styles.dim, { top: hole.y, left: 0, width: Math.max(hole.x, 0), height: hole.h }]} />
          <View style={[styles.dim, { top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }]} />
          <View style={[styles.ring, { top: hole.y, left: hole.x, width: hole.w, height: hole.h }]} pointerEvents="none" />
        </>
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
        <Text style={styles.counter}>
          {step + 1} of {STEPS.length}
        </Text>
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
    ring: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: radii.card,
    },
    card: {
      position: 'absolute',
      backgroundColor: colors.card,
      borderRadius: radii.sheet,
      padding: spacing.lg,
      gap: spacing.xs,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    counter: { ...type.caption, color: colors.textSecondary },
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
      borderRadius: radii.button,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
    },
    nextText: { ...type.label, color: colors.accentText },
  });
