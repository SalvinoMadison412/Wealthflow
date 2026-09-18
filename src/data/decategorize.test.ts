import { addMonth, parseMonths, removeMonth } from './decategorize';

test('parseMonths tolerates a missing or corrupt setting', () => {
  expect(parseMonths(null)).toEqual([]);
  expect(parseMonths('not json')).toEqual([]);
  expect(parseMonths('{"a":1}')).toEqual([]);
  expect(parseMonths('["2026-03",4]')).toEqual(['2026-03']);
});

test('addMonth is idempotent, removeMonth drops only that month', () => {
  expect(addMonth(['2026-03'], '2026-03')).toEqual(['2026-03']);
  expect(addMonth(['2026-03'], '2026-04')).toEqual(['2026-03', '2026-04']);
  expect(removeMonth(['2026-03', '2026-04'], '2026-03')).toEqual(['2026-04']);
});
