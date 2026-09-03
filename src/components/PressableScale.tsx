import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

interface PressableScaleProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

// Shared native-driver press feedback (scale down slightly on press-in) used
// wherever a card/button in the design needs a tactile response.
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
    <Pressable
      {...pressableProps}
      style={style}
      onPressIn={(e) => {
        animateTo(0.97);
        pressableProps.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        pressableProps.onPressOut?.(e);
      }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}
