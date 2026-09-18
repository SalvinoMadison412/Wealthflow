import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../theme/tokens';

// The mark: a stroked "W" whose last stroke rises into an arrow. Traced
// from assets/splash-icon.png (1024 grid), cropped to the mark's bounds.
export const LOGO_VIEWBOX = '240 290 550 450';
export const LOGO_ASPECT = 550 / 450;
const LOGO_STROKE = 46;
export const LOGO_W_PATH = 'M280 455 L378 700 L470 510 L565 700 L650 480 L735 340';
export const LOGO_ARROW_PATH = 'M690 350 L745 322 L745 385';
// Approximate path lengths in viewBox units, for stroke-dash draw-on.
export const LOGO_W_LENGTH = 1100;
export const LOGO_ARROW_LENGTH = 150;

export const logoStroke = {
  fill: 'none',
  strokeWidth: LOGO_STROKE,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

interface LogoProps {
  /** Rendered height; width follows the mark's aspect ratio. */
  size?: number;
  color?: string;
}

export function Logo({ size = 24, color = colors.textPrimary }: LogoProps) {
  return (
    <Svg width={size * LOGO_ASPECT} height={size} viewBox={LOGO_VIEWBOX} accessibilityLabel="WealthFlow">
      <Path d={LOGO_W_PATH} stroke={color} {...logoStroke} />
      <Path d={LOGO_ARROW_PATH} stroke={color} {...logoStroke} />
    </Svg>
  );
}
