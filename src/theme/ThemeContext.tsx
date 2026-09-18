import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, darkColors, lightColors, PillPalette, pillPaletteFor } from './tokens';
import { getSetting } from '../db/queries';
import { useQuery } from '../db/useQuery';

export type Scheme = 'light' | 'dark';
export type Theme = { scheme: Scheme; colors: Colors; pillPalette: PillPalette };

const THEMES: Record<Scheme, Theme> = {
  light: { scheme: 'light', colors: lightColors, pillPalette: pillPaletteFor(lightColors, 'light') },
  dark: { scheme: 'dark', colors: darkColors, pillPalette: pillPaletteFor(darkColors, 'dark') },
};

const ThemeContext = createContext<Theme>(THEMES.light);

// `appearance` setting: 'light' | 'dark' | 'system' (default). Resolved
// once here; every screen builds its StyleSheet from the result via
// useStyles. ponytail: one context for the whole tree — split per screen
// only if a theme switch ever shows up in the profiler.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const appearance = useQuery(() => getSetting('appearance'), []);
  const system = useColorScheme();
  const scheme: Scheme =
    appearance === 'dark' || (appearance !== 'light' && system === 'dark') ? 'dark' : 'light';
  return <ThemeContext.Provider value={THEMES[scheme]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

// `factory` is a module-level `makeStyles = (theme) => StyleSheet.create(...)`;
// it runs once per theme, not per render.
export function useStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
