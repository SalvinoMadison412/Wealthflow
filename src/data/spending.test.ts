import { chartEndMonth, expenseTone, topWithOthers } from './spending';

test('equal income and expenses is a red flag at full red', () => {
  expect(expenseTone(50000, 50000)).toEqual({ ratio: 1, opacity: 1, flag: true });
});

test('spending 90% or more of income is flagged', () => {
  expect(expenseTone(100, 92).flag).toBe(true);
  expect(expenseTone(100, 89).flag).toBe(false);
});

test('low spending is toned down', () => {
  expect(expenseTone(100, 20)).toEqual({ ratio: 0.2, opacity: 0.35, flag: false });
});

test('the red ramps up between half and 90% of income', () => {
  const { opacity } = expenseTone(100, 70);
  expect(opacity).toBeGreaterThan(0.35);
  expect(opacity).toBeLessThan(1);
});

test('spending with no income is flagged; an empty month is not', () => {
  expect(expenseTone(0, 500)).toEqual({ ratio: null, opacity: 1, flag: true });
  expect(expenseTone(0, 0).flag).toBe(false);
});

test('chart window starts at the oldest data month', () => {
  expect(chartEndMonth(['2026-03'], 6, '2026-09')).toBe('2026-08');
  expect(chartEndMonth(['2026-04', '2026-03'], 6, '2026-09')).toBe('2026-08');
  // Never past the current month; older data outside the window drops off.
  expect(chartEndMonth(['2026-08'], 6, '2026-09')).toBe('2026-09');
  expect(chartEndMonth(['2026-09', '2026-01'], 6, '2026-09')).toBe('2026-09');
  expect(chartEndMonth(['2026-09', '2026-04'], 6, '2026-09')).toBe('2026-09');
  expect(chartEndMonth([], 6, '2026-09')).toBe('2026-09');
});

test('top categories keep their slice, the rest merge', () => {
  const r = topWithOthers([{ spent: 5 }, { spent: 4 }, { spent: 3 }, { spent: 2 }, { spent: 1 }, { spent: 1 }], 4);
  expect(r.top).toHaveLength(4);
  expect(r.othersSpent).toBe(2);
});
