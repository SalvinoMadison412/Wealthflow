import { bucketTotals, isValidPreset, planned, progressPercent, progressState, PRESETS } from './budget';

test('the built-in presets sum to 100', () => {
  expect(isValidPreset(PRESETS['80/20'])).toBe(true);
  expect(isValidPreset(PRESETS['70/30'])).toBe(true);
});

test('a custom preset that does not sum to 100 is invalid', () => {
  expect(isValidPreset({ needs: 60, savings: 35 })).toBe(false);
  expect(isValidPreset({ needs: 60, savings: 45 })).toBe(false);
});

test('a negative percentage is invalid even if the total is 100', () => {
  expect(isValidPreset({ needs: 110, savings: -10 })).toBe(false);
});

test('planned is income times percentage', () => {
  expect(planned(50000, 60)).toBe(30000);
  expect(planned(0, 60)).toBe(0);
});

test('bucketTotals sums spend per bucket', () => {
  const totals = bucketTotals([
    { bucket: 'needs', spent: 100 },
    { bucket: 'needs', spent: 50 },
    { bucket: 'savings', spent: 20 },
  ]);
  expect(totals).toEqual({ needs: 150, savings: 20 });
});

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
