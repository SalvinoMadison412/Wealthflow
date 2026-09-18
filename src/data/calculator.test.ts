import { futureValue, monthsToGoal } from './calculator';

test('futureValue: known compound-interest value (₹1,000/mo at 12%/yr for 1 year)', () => {
  // FV = PMT * ((1+r)^n - 1) / r, r = 0.01/mo, n = 12
  expect(futureValue(1000, 12, 1)).toBeCloseTo(12682.5, 1);
});

test('futureValue: zero rate is just contribution * months, no compounding', () => {
  expect(futureValue(1000, 0, 1)).toBe(12000);
  expect(futureValue(500, 0, 2)).toBe(12000);
});

test('futureValue: zero contribution is zero regardless of rate', () => {
  expect(futureValue(0, 12, 5)).toBe(0);
});

test('monthsToGoal: zero rate is goal / contribution, rounded up', () => {
  expect(monthsToGoal(12000, 1000, 0)).toBe(12);
  expect(monthsToGoal(12500, 1000, 0)).toBe(13);
});

test('monthsToGoal: a known compounding case reaches the goal in a sane number of months', () => {
  const months = monthsToGoal(12682.5, 1000, 12);
  expect(months).toBe(12);
});

test('monthsToGoal: no contribution is unreachable', () => {
  expect(monthsToGoal(10000, 0, 10)).toBeNull();
});

test('monthsToGoal: a zero or negative goal is not a valid question', () => {
  expect(monthsToGoal(0, 1000, 10)).toBeNull();
  expect(monthsToGoal(-100, 1000, 10)).toBeNull();
});
