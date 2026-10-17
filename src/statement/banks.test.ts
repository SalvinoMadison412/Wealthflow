import { BANK_CLOSING_BALANCE, BANK_LAYOUTS, BANK_OPENING_BALANCE, syntheticBankPages } from './fixtures/syntheticBanks';
import { reconcile } from './reconciliation';
import { parseStatement } from './registry';

// The same six transactions in ten banks' table layouts (see the fixture's
// caveat: layouts are approximations written from memory). SBI and HDFC also
// carry a wrapped narration and amounts printed below the date, which only
// the column reader (columns.ts) can place.
const DATES = ['2026-03-07', '2026-03-09', '2026-03-15', '2026-03-31', '2026-03-31', '2026-03-31'];
const WITHDRAWALS = [350, 500, null, null, 2000, 300];
const DEPOSITS = [null, null, 120000, 12.5, null, null];

// Merchants are only asserted where the UPI narration shape is documented
// (SBI, HDFC, ICICI, Axis); undefined = not asserted.
const MERCHANTS: Record<string, (string | undefined)[]> = {
  sbi: ['Blinkit', 'Ravi Kumar N', undefined, undefined, 'Mutual Fund SIP', 'Swiggy'],
  hdfc: ['Blinkit', 'Ravi Kumar N', undefined, undefined, 'Mutual Fund SIP', 'Swiggy'],
  icici: ['Blinkit', 'Ravi', undefined, 'Interest', 'Mutual Fund SIP', 'Swiggy'],
  axis: ['Blinkit', 'Ravi Kumar N', undefined, 'Interest', 'Mutual Fund SIP', 'Swiggy'],
};

describe.each(BANK_LAYOUTS.map((layout) => [layout.id, layout] as const))('%s layout', (id, layout) => {
  const statement = parseStatement(syntheticBankPages(layout));

  test('finds every row and the opening balance', () => {
    expect(statement.transactions).toHaveLength(6);
    expect(statement.openingBalance).toBe(BANK_OPENING_BALANCE);
    expect(statement.closingBalance).toBe(BANK_CLOSING_BALANCE);
  });

  test('accounts for every row in the PDF', () => {
    expect(statement.coverage).toMatchObject({ rowsInPdf: 6, rowsRead: 6, unreadDates: [], mismatchDates: [] });
  });

  test('is verified by column; a layout without withdrawal/deposit headers by the column search', () => {
    // PNB-style: one Amount column plus a Dr/Cr type, so no header match.
    expect(statement.coverage).toMatchObject({ verified: true, layout: id === 'pnb' ? 'search' : 'header' });
  });

  test('reconciles', () => {
    expect(reconcile(statement).ok).toBe(true);
  });

  test('reads dates and debit/credit amounts', () => {
    expect(statement.transactions.map((t) => t.date)).toEqual(DATES);
    expect(statement.transactions.map((t) => t.withdrawal)).toEqual(WITHDRAWALS);
    expect(statement.transactions.map((t) => t.deposit)).toEqual(DEPOSITS);
  });

  test('names the bank from the header, not from narrations', () => {
    expect(statement.bank).toBe(layout.bankName);
  });

  test('reads merchants where the narration shape is known', () => {
    const expected = MERCHANTS[id];
    if (!expected) return;
    statement.transactions.forEach((t, i) => {
      if (expected[i]) expect(t.merchant).toBe(expected[i]);
    });
  });
});

test('a statement that never names its bank gets none', () => {
  const pages = syntheticBankPages(BANK_LAYOUTS[0]);
  pages[0].items = pages[0].items.filter((item) => item.str !== BANK_LAYOUTS[0].bankName);
  expect(parseStatement(pages).bank).toBeUndefined();
});

test('another bank named inside a narration is not the statement bank', () => {
  const pages = syntheticBankPages(BANK_LAYOUTS[2]);
  pages[0].items = pages[0].items.filter((item) => item.str !== BANK_LAYOUTS[2].bankName);
  // ICICI narrations mention "YES BANK" and "AXIS BANK".
  expect(parseStatement(pages).bank).toBeUndefined();
});

test.todo('narrations wrapped onto a second line keep their continuation text');

// Statements printed latest-first, and brought/carried-forward rows, in every
// layout: still six transactions, oldest first, each following the last.
describe.each(
  BANK_LAYOUTS.flatMap((layout) =>
    [
      { newestFirst: true },
      { carryRows: true },
      { newestFirst: true, carryRows: true },
    ].map((opts) => [`${layout.id} ${JSON.stringify(opts)}`, layout, opts] as const)
  )
)('%s', (_name, layout, opts) => {
  const statement = parseStatement(syntheticBankPages(layout, opts));

  test('reads six transactions oldest first and balances', () => {
    expect(statement.transactions.map((t) => t.date)).toEqual(DATES);
    expect(statement.transactions.map((t) => t.withdrawal)).toEqual(WITHDRAWALS);
    expect(statement.transactions.map((t) => t.deposit)).toEqual(DEPOSITS);
    expect(statement.openingBalance).toBe(BANK_OPENING_BALANCE);
    expect(statement.closingBalance).toBe(BANK_CLOSING_BALANCE);
    expect(reconcile(statement).ok).toBe(true);
  });

  test('does not count brought/carried-forward rows as transactions', () => {
    expect(statement.coverage).toMatchObject({ rowsInPdf: 6, rowsRead: 6, unreadDates: [], mismatchDates: [] });
  });
});
