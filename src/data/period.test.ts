import { newestMonthIn, periodRange, resolvePeriod } from './period';

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

describe('resolvePeriod', () => {
  const months = ['2024-02', '2024-01', '2023-12', '2023-11'];

  test('no choice follows the newest month', () => {
    expect(resolvePeriod(undefined, months)).toMatchObject({ month: '2024-02', period: '2024-02', older: '2024-01', newer: undefined });
  });

  test('stepping crosses the year boundary', () => {
    expect(resolvePeriod('2024-01', months)).toMatchObject({ older: '2023-12', newer: '2024-02', year: '2024' });
  });

  test('a hidden month falls back to the newest', () => {
    expect(resolvePeriod('2022-05', months).month).toBe('2024-02');
  });

  test('a year choice steps by year', () => {
    expect(resolvePeriod('2023', months)).toMatchObject({ month: null, period: '2023', years: ['2024', '2023'], older: undefined, newer: '2024' });
  });

  test('picking a year lands on its newest month', () => {
    expect(newestMonthIn('2023', months)).toBe('2023-12');
  });
});
