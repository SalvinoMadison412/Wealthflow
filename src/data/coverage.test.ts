import { gapsBetween, monthCoverage, rangeLabel } from './coverage';

const p = (start: string, end: string, accountId = 'a') => ({ accountId, start, end });

describe('monthCoverage', () => {
  test('a half month is partial, with the rest missing', () => {
    const c = monthCoverage([p('2026-10-01', '2026-10-15')], '2026-10', '2026-12-01');
    expect(c.complete).toBe(false);
    expect(c.days).toBe(31);
    expect(c.accounts[0]).toEqual({ accountId: 'a', covered: [['2026-10-01', '2026-10-15']], missing: [['2026-10-16', '2026-10-31']] });
  });

  test('two statements that touch make a complete month', () => {
    const c = monthCoverage([p('2026-09-16', '2026-10-15'), p('2026-10-16', '2026-11-15')], '2026-10', '2026-12-01');
    expect(c.complete).toBe(true);
    expect(c.accounts[0].covered).toEqual([['2026-10-01', '2026-10-31']]);
  });

  test('a hole in the middle is missing', () => {
    const c = monthCoverage([p('2026-10-01', '2026-10-10'), p('2026-10-20', '2026-10-31')], '2026-10', '2026-12-01');
    expect(c.accounts[0].missing).toEqual([['2026-10-11', '2026-10-19']]);
  });

  test('today and later are not missing yet', () => {
    expect(monthCoverage([p('2026-10-01', '2026-10-15')], '2026-10', '2026-10-16').complete).toBe(true);
    expect(monthCoverage([p('2026-10-01', '2026-10-15')], '2026-10', '2026-10-18').accounts[0].missing).toEqual([
      ['2026-10-16', '2026-10-17'],
    ]);
  });

  test('only accounts with statements in the month count', () => {
    const c = monthCoverage([p('2026-10-01', '2026-10-31'), p('2026-01-01', '2026-01-31', 'b')], '2026-10', '2026-12-01');
    expect(c.accounts.map((a) => a.accountId)).toEqual(['a']);
    expect(c.complete).toBe(true);
  });

  test('February has 28 days', () => {
    expect(monthCoverage([p('2026-02-01', '2026-02-28')], '2026-02', '2026-12-01')).toMatchObject({ days: 28, complete: true });
  });
});

describe('gapsBetween', () => {
  test('finds a hole between statements of one account only', () => {
    expect(
      gapsBetween([p('2026-10-01', '2026-10-10'), p('2026-10-20', '2026-10-31'), p('2026-10-11', '2026-10-31', 'b')])
    ).toEqual([{ accountId: 'a', from: '2026-10-11', to: '2026-10-19' }]);
  });

  test('back-to-back and overlapping statements leave no gap', () => {
    expect(gapsBetween([p('2026-10-01', '2026-10-15'), p('2026-10-16', '2026-10-31'), p('2026-10-10', '2026-10-20')])).toEqual([]);
  });
});

test('rangeLabel', () => {
  expect(rangeLabel(['2026-10-01', '2026-10-15'])).toBe('1–15 Oct');
  expect(rangeLabel(['2026-09-28', '2026-10-03'])).toBe('28 Sept – 3 Oct');
  expect(rangeLabel(['2026-10-05', '2026-10-05'])).toBe('5 Oct');
  expect(rangeLabel(['2021-01-01', '2026-10-17'])).toBe('1 Jan 2021 – 17 Oct 2026');
});
