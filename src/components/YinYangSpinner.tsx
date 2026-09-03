import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { YinYang } from './YinYang';

interface YinYangSpinnerProps {
  size?: number;
}

// A continuously-rotating yin-yang used specifically for the one loading
// state that's actually processing credits/debits (statement parsing) —
// not a general-purpose spinner reused everywhere.
export function YinYangSpinner({ size = 36 }: YinYangSpinnerProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <YinYang size={size} />
    </Animated.View>
  );
}
