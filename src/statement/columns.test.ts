import { BANK_LAYOUTS, syntheticBankPages } from './fixtures/syntheticBanks';
import { syntheticKotakPages } from './fixtures/syntheticKotakStatement';
import { parseStatement } from './registry';

const hdfc = BANK_LAYOUTS.find((layout) => layout.id === 'hdfc')!;

test('a row whose amounts cannot be read is reported, not skipped', () => {
  const pages = syntheticBankPages(hdfc);
  // Row 2 (09/03/26): drop its withdrawal and balance.
  pages[0].items = pages[0].items.filter((item) => item.str !== '500.00' && item.str !== '4,150.00');
  const { coverage, transactions } = parseStatement(pages);
  expect(coverage.rowsInPdf).toBe(6);
  expect(coverage.rowsRead).toBe(5);
  expect(coverage.unreadDates).toEqual(['2026-03-09']);
  expect(transactions).toHaveLength(5);
});

test('a balance that does not follow from the previous row is flagged', () => {
  const pages = syntheticBankPages(hdfc);
  const balance = pages[0].items.find((item) => item.str === '1,24,150.00')!;
  balance.str = '1,24,160.00';
  expect(parseStatement(pages).coverage.mismatchDates).toEqual(['2026-03-15', '2026-03-31']);
});

test('the summary block after the last row is not read into it', () => {
  const statement = parseStatement(syntheticBankPages(hdfc));
  expect(statement.closingBalance).toBe(121862.5);
  expect(statement.transactions[5].withdrawal).toBe(300);
});

test('without a table header the line reader reports coverage, unverified', () => {
  expect(parseStatement(syntheticKotakPages).coverage).toEqual({
    verified: false,
    rowsInPdf: 6,
    rowsRead: 6,
    unreadDates: [],
    mismatchDates: [],
  });
});
