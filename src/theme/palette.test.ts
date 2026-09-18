import { darkColors, lightColors, pillPaletteFor } from './tokens';

test('dark and light palettes define the same keys', () => {
  expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
});

test('every colour is a hex value', () => {
  for (const palette of [lightColors, darkColors]) {
    for (const value of Object.values(palette)) expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
  }
});

test('pill palettes have ten entries in both schemes', () => {
  expect(pillPaletteFor(lightColors, 'light')).toHaveLength(10);
  expect(pillPaletteFor(darkColors, 'dark')).toHaveLength(10);
});
