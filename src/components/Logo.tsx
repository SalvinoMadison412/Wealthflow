import React from 'react';
import { Text } from 'react-native';

import { colors, type } from '../theme/tokens';

interface LogoProps {
  /** Tab-bar/app-icon scale: just the "W", not the full wordmark. */
  compact?: boolean;
  size?: number;
  color?: string;
}

// The logo is the wordmark itself, set in the display face — no separate
// icon mark. At compact sizes (tab bar, app icon) it reduces to "W" alone
// rather than shrinking the full word past legibility.
export function Logo({ compact = false, size = 22, color = colors.textPrimary }: LogoProps) {
  return (
    <Text
      style={{ ...type.display, fontSize: size, lineHeight: undefined, color }}
      numberOfLines={1}
    >
      {compact ? 'W' : 'WealthFlow'}
    </Text>
  );
}
