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

// Canonical palette. Use these for anything new.
const textPrimary = '#14161A';
const textSecondary = '#6B7280';
const border = '#E7E8EC';
const accent = '#4C5FD5';
const track = '#EEF0F4';

export const colors = {
  background: '#FAFAF8',
  card: '#FFFFFF',
  textPrimary,
  textSecondary,
  border,
  accent,
  accentText: '#FFFFFF',
  // Accent/secondary text on a dark surface (e.g. the Smart Calculator
  // card) — the plain accent/textSecondary values don't have enough
  // contrast against textPrimary as a background.
  accentOnDark: '#8B93E8',
  onDarkSecondary: '#A6ABDE',
  incomeFill: '#1FAA6D',
  incomeText: '#15803D',
  expenseFill: '#E5484D',
  expenseText: '#C0393E',
  warningFill: '#F5A623',
  warningText: '#92600B',
  track,
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Deterministic category-pill palette. Index by `category.position % 10`.
// Index 9 (slate) is reserved for "Uncategorized"; index 7 (sky) is
// reserved for "Transfer" — never assign either to a user category.
export const pillPalette: { bg: string; text: string }[] = [
  { bg: '#E8EBFA', text: '#3A4BB3' }, // 0 indigo
  { bg: '#E1F5EB', text: '#15803D' }, // 1 green
  { bg: '#FCE4E5', text: '#B3363B' }, // 2 coral
  { bg: '#FDF0D5', text: '#92600B' }, // 3 amber
  { bg: '#DDF4F2', text: '#0F766E' }, // 4 teal
  { bg: '#EFE6FA', text: '#6D28D9' }, // 5 purple
  { bg: '#FCE7F3', text: '#BE185D' }, // 6 pink
  { bg: '#E0F2FE', text: '#0369A1' }, // 7 sky — Transfer
  { bg: '#ECF5D8', text: '#4D7C0F' }, // 8 olive
  { bg: '#EDEFF3', text: '#475569' }, // 9 slate — Uncategorized
];

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
