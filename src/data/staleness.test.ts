import { isStatementStale } from './staleness';

const now = new Date('2026-09-18T00:00:00Z');

test('no statement is stale', () => {
  expect(isStatementStale(null, now)).toBe(true);
});

test('34 days old is fresh, 36 days old is stale', () => {
  expect(isStatementStale('2026-08-15', now)).toBe(false);
  expect(isStatementStale('2026-08-13', now)).toBe(true);
});

test('unparseable date counts as stale', () => {
  expect(isStatementStale('not a date', now)).toBe(true);
});
