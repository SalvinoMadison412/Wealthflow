import { combineAccountMonths } from './balance';

test('no rows means no summary', () => {
  expect(combineAccountMonths([])).toBeNull();
});

test('accounts sum and the balance walk reconciles', () => {
  const s = combineAccountMonths([
    { inflows: 50000, outflows: 20000, closing: 40000 },
    { inflows: 1000, outflows: 3000, closing: 8000 },
  ])!;
  expect(s).toEqual({ opening: 10000 + 10000, inflows: 51000, outflows: 23000, closing: 48000 });
  expect(s.opening + s.inflows - s.outflows).toBe(s.closing);
});
