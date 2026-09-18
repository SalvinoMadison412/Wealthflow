import { expenseTone } from './spending';

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
