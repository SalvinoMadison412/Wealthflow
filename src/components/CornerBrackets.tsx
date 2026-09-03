import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme/tokens';

interface CornerBracketsProps {
  children: React.ReactNode;
  style?: ViewStyle;
  size?: number;
  thickness?: number;
  inset?: number;
}

const CORNERS: Array<{ top?: number; bottom?: number; left?: number; right?: number }> = [
  { top: 0, left: 0 },
  { top: 0, right: 0 },
  { bottom: 0, left: 0 },
  { bottom: 0, right: 0 },
];

// Camera-viewfinder / reticle corner marks — a Nothing/CMF technical-
// annotation habit, built from plain Views (no SVG needed for straight
// bars). Wraps the dropzone instead of a dashed border.
export function CornerBrackets({ children, style, size = 18, thickness = 2, inset = 10 }: CornerBracketsProps) {
  return (
    <View style={[styles.container, style]}>
      {children}
      {CORNERS.map((corner, i) => (
        <View key={i} style={[styles.corner, corner, { width: size, height: size, margin: inset }]}>
          <View
            style={[
              styles.bar,
              {
                width: size,
                height: thickness,
                top: corner.bottom !== undefined ? size - thickness : 0,
              },
            ]}
          />
          <View
            style={[
              styles.bar,
              {
                width: thickness,
                height: size,
                left: corner.right !== undefined ? size - thickness : 0,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
  },
  bar: {
    position: 'absolute',
    backgroundColor: colors.onSurface,
  },
});
