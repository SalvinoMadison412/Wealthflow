import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

interface PressableScaleProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Shared native-driver press feedback (scale down slightly on press-in) used
// wherever a card/button in the design needs a tactile response. One node:
// the caller's style lays out the children directly (a `flexDirection:
// 'row'` button really is a row) and the scale applies to the whole box.
export function PressableScale({ style, children, ...pressableProps }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  return (
    <AnimatedPressable
      {...pressableProps}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e) => {
        animateTo(0.97);
        pressableProps.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        pressableProps.onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
