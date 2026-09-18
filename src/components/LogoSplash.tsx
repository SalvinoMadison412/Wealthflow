import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  LOGO_ARROW_LENGTH,
  LOGO_ARROW_PATH,
  LOGO_ASPECT,
  LOGO_VIEWBOX,
  LOGO_W_LENGTH,
  LOGO_W_PATH,
  logoStroke,
} from './Logo';
import { colors } from '../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const HEIGHT = 120;

// Full-screen overlay shown once at launch: the mark draws itself on
// (W stroke, then the arrowhead), holds, then the whole sheet fades and
// eases up to reveal the app already rendered underneath.
export function LogoSplash({ onDone }: { onDone: () => void }) {
  const wDraw = useRef(new Animated.Value(LOGO_W_LENGTH)).current;
  const arrowDraw = useRef(new Animated.Value(LOGO_ARROW_LENGTH)).current;
  const sheet = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      Animated.timing(wDraw, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // SVG props can't be driven natively
      }),
      Animated.timing(arrowDraw, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(350),
      Animated.timing(sheet, {
        toValue: 1,
        duration: 400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => finished && onDone());
  }, [wDraw, arrowDraw, sheet, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sheet,
        {
          opacity: sheet.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: sheet.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
        },
      ]}
    >
      <Svg width={HEIGHT * LOGO_ASPECT} height={HEIGHT} viewBox={LOGO_VIEWBOX}>
        <AnimatedPath
          d={LOGO_W_PATH}
          stroke={colors.textPrimary}
          strokeDasharray={LOGO_W_LENGTH}
          strokeDashoffset={wDraw}
          {...logoStroke}
        />
        <AnimatedPath
          d={LOGO_ARROW_PATH}
          stroke={colors.textPrimary}
          strokeDasharray={LOGO_ARROW_LENGTH}
          strokeDashoffset={arrowDraw}
          {...logoStroke}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
