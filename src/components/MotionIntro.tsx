import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';

import { Logo } from './Logo';
import { YinYang } from './YinYang';
import { colors, spacing } from '../theme/tokens';

const HOLD_MS = 500;
const REDUCED_MOTION_HOLD_MS = 400;

interface MotionIntroProps {
  onDone: () => void;
}

// The yin-yang spins and scales into place (the duality "resolving"), then
// the wordmark fades in below it, then both fade out together into the app.
export function MotionIntro({ onDone }: MotionIntroProps) {
  const yinYangOpacity = useRef(new Animated.Value(0)).current;
  const yinYangScale = useRef(new Animated.Value(0.6)).current;
  const yinYangRotate = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const groupOpacity = useRef(new Animated.Value(1)).current;
  const [dismissed, setDismissed] = useState(false);

  function finish() {
    if (dismissed) return;
    setDismissed(true);
    onDone();
  }

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;

      if (reduceMotion) {
        yinYangOpacity.setValue(1);
        yinYangScale.setValue(1);
        wordmarkOpacity.setValue(1);
        const timer = setTimeout(finish, REDUCED_MOTION_HOLD_MS);
        return () => clearTimeout(timer);
      }

      Animated.sequence([
        Animated.parallel([
          Animated.spring(yinYangOpacity, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 4 }),
          Animated.spring(yinYangScale, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 8 }),
          Animated.timing(yinYangRotate, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(wordmarkOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.delay(HOLD_MS),
        Animated.timing(groupOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) finish();
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  const rotate = yinYangRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-160deg', '0deg'],
  });

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={finish}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.screen, { opacity: groupOpacity }]}>
        <Animated.View
          style={{
            opacity: yinYangOpacity,
            transform: [{ scale: yinYangScale }, { rotate }],
          }}
        >
          <YinYang size={72} />
        </Animated.View>
        <Animated.View style={{ opacity: wordmarkOpacity, marginTop: spacing.stackSm }}>
          <Logo size={26} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
