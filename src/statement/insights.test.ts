import { isEntirelyUncategorized, spendByCategory, spendByMerchant, weekendVsWeekday } from './insights';
import { Rule } from '../data/RulesContext';
import { Transaction } from './types';

function tx(date: string, withdrawal: number, merchant: string): Transaction {
  return { date, description: merchant, merchant, refNo: null, withdrawal, deposit: null, balance: 0, raw: '' };
}

test('with no rules, every transaction is Uncategorized', () => {
  const txs = [tx('2026-03-07', 100, 'Blinkit')];
  const breakdown = spendByCategory(txs, []);
  expect(isEntirelyUncategorized(breakdown)).toBe(true);
});

test('spendByMerchant groups and sums by merchant, ignoring deposits', () => {
  const txs = [
    tx('2026-03-01', 100, 'Blinkit'),
    tx('2026-03-02', 50, 'Blinkit'),
    { ...tx('2026-03-03', 0, 'Salary Credit'), withdrawal: null, deposit: 20000 },
  ];
  expect(spendByMerchant(txs)).toEqual([{ label: 'Blinkit', value: 150 }]);
});

test('a matching rule takes spend out of Uncategorized', () => {
  const txs = [tx('2026-03-07', 100, 'Blinkit')];
  const rules: Rule[] = [{ id: '1', merchant: 'Blinkit', category: 'Food' }];
  expect(spendByCategory(txs, rules)).toEqual([{ label: 'Food', value: 100 }]);
});

test('weekendVsWeekday compares average spend per day, not raw totals', () => {
  // 2026-03-07 is a Saturday, 2026-03-09 a Monday.
  const txs = [tx('2026-03-07', 200, 'A'), tx('2026-03-09', 100, 'B')];
  const result = weekendVsWeekday(txs);
  expect(result.aAvg).toBe(200); // one weekend day, all its spend
  expect(result.bAvg).toBe(100); // one weekday, all its spend
});
