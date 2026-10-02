import { buildReports, defaultKind, KindRow, signed } from './statements';

const row = (id: string, kind: KindRow['kind'], deposit: number, withdrawal: number): KindRow => ({
  id,
  name: id,
  colorIndex: 0,
  kind,
  deposit,
  withdrawal,
});

// Opening cash 1000; closing = opening + deposits - withdrawals.
const build = (rows: KindRow[], opening = 1000) =>
  buildReports(rows, opening, opening + rows.reduce((s, r) => s + r.deposit - r.withdrawal, 0));

describe('signed', () => {
  it('income and liability follow deposits, expense and asset withdrawals', () => {
    expect(signed('income', 100, 30)).toBe(70);
    expect(signed('liability', 100, 30)).toBe(70);
    expect(signed('expense', 30, 100)).toBe(70);
    expect(signed('asset', 30, 100)).toBe(70);
  });
});

describe('buildReports', () => {
  it('a refund lowers the expense', () => {
    expect(build([row('food', 'expense', 20, 120)]).pl.totalExpenses).toBe(100);
  });

  it('a card payment lowers the liability', () => {
    // card spend is not a bank movement; the bill payment is a bank withdrawal
    expect(build([row('card', 'liability', 0, 300)]).bs.totalLiabilities).toBe(-300);
    expect(build([row('card', 'liability', 500, 300)]).bs.totalLiabilities).toBe(200);
  });

  it('a transfer pair nets to zero', () => {
    const r = build([row('transfer', 'asset', 100, 100)]);
    expect(r.bs.assets).toEqual([]);
    expect(r.bs.netWorth).toBe(1000);
  });

  it('a reversal lowers the income', () => {
    expect(build([row('salary', 'income', 1000, 100)]).pl.totalIncome).toBe(900);
  });

  it('check holds and unclassified is 0 when every row has a kind', () => {
    const r = build([
      row('salary', 'income', 5000, 0),
      row('food', 'expense', 0, 700),
      row('mf', 'asset', 0, 1000),
      row('card', 'liability', 200, 400),
    ]);
    expect(r.check.unclassified).toBe(0);
    expect(r.check.diff).toBeCloseTo(0);
    expect(r.check.ok).toBe(true);
    expect(r.pl.net).toBe(4300);
  });

  it('unclassified rows are reported and block the tick', () => {
    const r = build([row('uncategorized', null, 0, 250)]);
    expect(r.check.unclassified).toBe(-250);
    expect(r.check.diff).toBeCloseTo(0);
    expect(r.check.ok).toBe(false);
  });

  it('a drifting closing balance fails the check', () => {
    expect(buildReports([row('food', 'expense', 0, 100)], 1000, 800).check.ok).toBe(false);
  });
});

describe('defaultKind', () => {
  it('maps built-in names', () => {
    expect(defaultKind('Income')).toBe('income');
    expect(defaultKind('Credit card & loans')).toBe('liability');
    expect(defaultKind('Investments')).toBe('asset');
    expect(defaultKind('Travel')).toBe('expense');
  });
});
