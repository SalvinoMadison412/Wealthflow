// Transcribed from stitch_wealth_flow_money_mirror/wealth_flow/DESIGN.md.
// Single source for color/spacing/radius/type so every screen stays in sync.
import { TextStyle } from 'react-native';

export const colors = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f5f5',
  surfaceContainer: '#eeeeee',
  surfaceContainerHigh: '#e2e2e2',
  surfaceContainerHighest: '#d6d6d6',
  onSurface: '#1a1a1a',
  onSurfaceVariant: '#5d5f5e',
  outline: '#8e8e8e',
  outlineVariant: '#dadada',
  primary: '#1a1c1c',
  onPrimary: '#ffffff',
  primaryContainer: '#3d3d3d',
  signal: '#000000',
  secondary: '#5d5f5e',
  error: '#ba1a1a',
  white: '#ffffff',
  black: '#000000',
} as const;

export const spacing = {
  marginPage: 32,
  gutter: 20,
  stackSm: 8,
  stackMd: 24,
  stackLg: 48,
} as const;

export const radii = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  pill: 9999,
} as const;

// One distinct font family per weight (not fontFamily + fontWeight): custom
// fonts + fontWeight matching is unreliable on Android, so each token names
// its exact weight-specific file directly.
//
// Two registers, deliberately not blended:
// - Functional (Space Grotesk headlines + IBM Plex Mono body/labels/Doto
//   numerals): everyday UI — nav, forms, transaction data. Technical,
//   grid-based, stays legible.
// - Expressive (Yuji Syuku): wordmark, motion intro, section dividers only.
//   Never appears in a form field or a transaction row.
type NamedTextStyle = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'
>;

export const type: Record<
  | 'displayLg'
  | 'headlineLg'
  | 'headlineMd'
  | 'bodyLg'
  | 'bodyMd'
  | 'labelMd'
  | 'labelSm'
  | 'numeral'
  | 'expressive',
  NamedTextStyle
> = {
  displayLg: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -0.02 * 48,
  },
  headlineLg: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 28,
    lineHeight: 36,
  },
  headlineMd: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 24,
    lineHeight: 32,
  },
  bodyLg: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 18,
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  labelMd: {
    fontFamily: 'IBMPlexMono-SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.05 * 14,
  },
  labelSm: {
    fontFamily: 'IBMPlexMono-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  // Dot-matrix numerals — balance/amount figures only, the Nothing "Ndot"-
  // style treatment. Never used for prose.
  numeral: {
    fontFamily: 'Doto-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  // Ink-brush expressive layer — wordmark/motion/dividers only.
  expressive: {
    fontFamily: 'YujiSyuku-Regular',
    fontSize: 22,
    lineHeight: 28,
  },
};

export const fontAssets = {
  'SpaceGrotesk-Medium': require('../../assets/fonts/SpaceGrotesk-Medium.ttf'),
  'SpaceGrotesk-Bold': require('../../assets/fonts/SpaceGrotesk-Bold.ttf'),
  'IBMPlexMono-Regular': require('../../assets/fonts/IBMPlexMono-Regular.ttf'),
  'IBMPlexMono-Medium': require('../../assets/fonts/IBMPlexMono-Medium.ttf'),
  'IBMPlexMono-SemiBold': require('../../assets/fonts/IBMPlexMono-SemiBold.ttf'),
  'Doto-Bold': require('../../assets/fonts/Doto-Bold.ttf'),
  'YujiSyuku-Regular': require('../../assets/fonts/YujiSyuku-Regular.ttf'),
} as const;

// The single "ambient shadow" DESIGN.md specifies for lifted cards.
export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.04,
  shadowRadius: 30,
  elevation: 3,
} as const;
