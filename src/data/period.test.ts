import { periodRange } from './period';

const inRange = (period: string, date: string) => {
  const [lo, hi] = periodRange(period);
  return date >= lo && date < hi;
};

test('a month range holds its first and last day only', () => {
  expect(inRange('2025-03', '2025-03-01')).toBe(true);
  expect(inRange('2025-03', '2025-03-31')).toBe(true);
  expect(inRange('2025-03', '2025-02-28')).toBe(false);
  expect(inRange('2025-03', '2025-04-01')).toBe(false);
});

test('a year range holds the whole year only', () => {
  expect(inRange('2025', '2025-01-01')).toBe(true);
  expect(inRange('2025', '2025-12-31')).toBe(true);
  expect(inRange('2025', '2024-12-31')).toBe(false);
  expect(inRange('2025', '2026-01-01')).toBe(false);
});
