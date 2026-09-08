import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../theme/tokens';

interface YinYangProps {
  size?: number;
}

// Accurate yin-yang geometry: an outer circle outline, one comma-shaped
// half filled black (the rest of the circle reads as the white half
// against the screen's white background), and the two accent dots —
// opposite color, centered in each half's broad lobe. This is the one
// shape in the app that genuinely needs path math react-native-svg
// provides; plain View/borderRadius clipping can't reliably reproduce
// the S-curve.
const R = 50;

const COMMA_PATH = `M 0,-${R} A ${R},${R} 0 0,1 0,${R} A ${R / 2},${R / 2} 0 0,1 0,0 A ${
  R / 2
},${R / 2} 0 0,0 0,-${R} Z`;

export function YinYang({ size = 64 }: YinYangProps) {
  return (
    <Svg width={size} height={size} viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}>
      <Circle cx={0} cy={0} r={R} fill="none" stroke={colors.onSurface} strokeWidth={2} />
      <Path d={COMMA_PATH} fill={colors.onSurface} />
      <Circle cx={0} cy={-R / 2} r={R / 6} fill={colors.onSurface} />
      <Circle cx={0} cy={R / 2} r={R / 6} fill={colors.white} />
    </Svg>
  );
}
