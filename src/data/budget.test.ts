import { progressPercent, progressState } from './budget';

test('progressState: under, warning, and over thresholds', () => {
  expect(progressState(50, 100)).toBe('under');
  expect(progressState(80, 100)).toBe('warning');
  expect(progressState(99, 100)).toBe('warning');
  expect(progressState(101, 100)).toBe('over');
});

test('progressState with zero budget: over if anything was spent, under otherwise (the zero-income/zero-budget path)', () => {
  expect(progressState(0, 0)).toBe('under');
  expect(progressState(50, 0)).toBe('over');
});

test('progressPercent caps at 100 even when over budget', () => {
  expect(progressPercent(150, 100)).toBe(100);
  expect(progressPercent(50, 100)).toBe(50);
  expect(progressPercent(0, 0)).toBe(0);
  expect(progressPercent(50, 0)).toBe(100);
});
