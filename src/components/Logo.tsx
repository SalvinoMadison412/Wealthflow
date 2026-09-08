import React from 'react';
import { Text } from 'react-native';

import { colors, type } from '../theme/tokens';

interface LogoProps {
  /** Tab-bar/app-icon scale: just the brush "W", not the full wordmark. */
  compact?: boolean;
  size?: number;
  color?: string;
}

// The logo is the wordmark itself, set in the ink-brush expressive face
// (Yuji Syuku) — no separate icon mark. At compact sizes (tab bar, app
// icon) it reduces to the brush "W" alone rather than shrinking the full
// word past legibility.
export function Logo({ compact = false, size = 22, color = colors.onSurface }: LogoProps) {
  return (
    <Text
      style={{ ...type.expressive, fontSize: size, color }}
      numberOfLines={1}
    >
      {compact ? 'W' : 'WealthFlow'}
    </Text>
  );
}
