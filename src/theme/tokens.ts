// Redesign tokens — see docs/REDESIGN_PLAN.md PR 1 for the source of every
// value below. Single source for color/spacing/radii/type so every screen
// stays in sync.
import { TextStyle } from 'react-native';

// Loaded at runtime via useFonts in App.tsx, not the expo-font config
// plugin: plugin-embedded fonts only take effect in a prebuilt/custom-dev-
// client binary, not Expo Go, and CLAUDE.md requires staying Expo-Go-
// compatible (no custom dev client). See docs/REDESIGN_PLAN.md PR 1 note.
export const fontAssets = {
  'Inter-Regular': require('../../assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium': require('../../assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../../assets/fonts/Inter-SemiBold.ttf'),
  'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
  'Manrope-Bold': require('../../assets/fonts/Manrope-Bold.ttf'),
  'Manrope-ExtraBold': require('../../assets/fonts/Manrope-ExtraBold.ttf'),
} as const;

// Canonical palettes. Screens never import these directly — they read
// `colors` / `pillPalette` from useTheme() so the appearance setting
// (light / dark / system) applies everywhere.
export const lightColors = {
  background: '#FAFAF8',
  card: '#FFFFFF',
  textPrimary: '#14161A',
  textSecondary: '#6B7280',
  border: '#E7E8EC',
  accent: '#0A8058', // emerald; 5:1 against white so button labels pass AA
  accentText: '#FFFFFF',
  // Accent/secondary text on a dark surface (e.g. the Smart Calculator
  // card) — the plain accent/textSecondary values don't have enough
  // contrast against textPrimary as a background.
  accentOnDark: '#6EE7B7',
  onDarkSecondary: '#A7C4B8',
  incomeFill: '#1FAA6D',
  incomeText: '#15803D',
  expenseFill: '#E5484D',
  expenseText: '#C0393E',
  warningFill: '#F5A623',
  warningText: '#92600B',
  track: '#EEF0F4',
  // Fixed dark surface for cards that stay dark in both themes (Smart
  // Calculator, snackbar). Not textPrimary: that goes near-white in dark.
  inverse: '#14161A',
  white: '#FFFFFF',
  black: '#000000',
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  background: '#0F1115',
  card: '#181B21',
  textPrimary: '#F2F3F5',
  textSecondary: '#9AA0AA',
  border: '#2A2E36',
  accent: '#34D399',
  accentText: '#0E1015', // dark ink on mint: 9.9:1
  accentOnDark: '#6EE7B7',
  onDarkSecondary: '#A7C4B8',
  incomeFill: '#1FAA6D',
  incomeText: '#4ADE80',
  expenseFill: '#E5484D',
  expenseText: '#F87171',
  warningFill: '#F5A623',
  warningText: '#FBBF24',
  track: '#232730',
  inverse: '#232833',
  white: '#FFFFFF',
  black: '#000000',
};

// The splash and the native launch screen stay light regardless of the
// appearance setting; this is the only place that reads a fixed palette.
export const colors = lightColors;

// Deterministic category-pill palette. Index by `category.position % 10`.
// Index 9 (slate) is reserved for "Uncategorized"; index 7 (sky) is
// reserved for "Transfer" — never assign either to a user category.
export type PillPalette = { bg: string; text: string }[];

const PILL_HUES: { light: { bg: string; text: string }; dark: string }[] = [
  { light: { bg: '#E8EBFA', text: '#3A4BB3' }, dark: '#8B9BF4' }, // 0 indigo
  { light: { bg: '#E1F5EB', text: '#15803D' }, dark: '#4ADE80' }, // 1 green
  { light: { bg: '#FCE4E5', text: '#B3363B' }, dark: '#F87171' }, // 2 coral
  { light: { bg: '#FDF0D5', text: '#92600B' }, dark: '#FBBF24' }, // 3 amber
  { light: { bg: '#DDF4F2', text: '#0F766E' }, dark: '#2DD4BF' }, // 4 teal
  { light: { bg: '#EFE6FA', text: '#6D28D9' }, dark: '#C084FC' }, // 5 purple
  { light: { bg: '#FCE7F3', text: '#BE185D' }, dark: '#F472B6' }, // 6 pink
  { light: { bg: '#E0F2FE', text: '#0369A1' }, dark: '#38BDF8' }, // 7 sky — Transfer
  { light: { bg: '#ECF5D8', text: '#4D7C0F' }, dark: '#A3E635' }, // 8 olive
  { light: { bg: '#EDEFF3', text: '#475569' }, dark: '#94A3B8' }, // 9 slate — Uncategorized
];

// Dark pills reuse the hue as text and a 22%-alpha wash of it as the
// background, which reads on dark cards without a second hand-tuned set.
// Needs / savings chart colours: bright, readable on both the light
// and dark card, so not part of the per-scheme palettes.
export const bucketColors = {
  needs: '#2F80FF',
  savings: '#12D6A0',
} as const;

export function pillPaletteFor(_colors: Colors, scheme: 'light' | 'dark'): PillPalette {
  return PILL_HUES.map((h) => (scheme === 'light' ? h.light : { bg: `${h.dark}38`, text: h.dark }));
}

export const pillPalette: PillPalette = pillPaletteFor(lightColors, 'light');

const sm = 8;
const lg = 16;
const xxl = 24;
const xxxl = 32;

export const spacing = {
  xs: 4,
  sm,
  md: 12,
  lg,
  xl: 20,
  xxl,
  xxxl,
  pageGutter: 16,
  contentMaxWidth: 600,
} as const;

const buttonRadius = 12;
const cardRadius = 16;
const sheetRadius = 20;

export const radii = {
  button: buttonRadius,
  card: cardRadius,
  sheet: sheetRadius,
  pill: 999,
} as const;

// One distinct font family per weight (not fontFamily + fontWeight): custom
// fonts + fontWeight matching is unreliable on Android, so each token names
// its exact weight-specific file directly.
type NamedTextStyle = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'
>;

const display: NamedTextStyle = { fontFamily: 'Manrope-ExtraBold', fontSize: 32, lineHeight: 40 };
const h1: NamedTextStyle = { fontFamily: 'Manrope-Bold', fontSize: 24, lineHeight: 32 };
const h2: NamedTextStyle = { fontFamily: 'Manrope-Bold', fontSize: 18, lineHeight: 26 };
const body: NamedTextStyle = { fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 22 };
const label: NamedTextStyle = { fontFamily: 'Inter-Medium', fontSize: 13, lineHeight: 18 };
const caption: NamedTextStyle = { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 16 };
const amountMd: NamedTextStyle = { fontFamily: 'Inter-SemiBold', fontSize: 20, lineHeight: 26 };

export const type = {
  display,
  h1,
  h2,
  h3: { fontFamily: 'Manrope-SemiBold', fontSize: 16, lineHeight: 22 } as NamedTextStyle,
  body,
  bodyMedium: { fontFamily: 'Inter-Medium', fontSize: 15, lineHeight: 22 } as NamedTextStyle,
  label,
  caption,
  amountSm: { fontFamily: 'Inter-SemiBold', fontSize: 15, lineHeight: 22 } as NamedTextStyle,
  amountMd,
  amountLg: { fontFamily: 'Inter-SemiBold', fontSize: 28, lineHeight: 34 } as NamedTextStyle,
} as const;

// The single "ambient shadow" for lifted cards.
export const cardShadow = {
  shadowColor: '#14161A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
} as const;

// Caps scrollable content width on tablets; a no-op on phones (width <
// 600 already). Spread into a screen's contentContainerStyle.
export const contentWrap = {
  width: '100%',
  maxWidth: spacing.contentMaxWidth,
  alignSelf: 'center',
} as const;
