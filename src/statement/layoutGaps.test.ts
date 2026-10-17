import { PageContent, TextItem } from '../pdf/types';
import { parseStatement } from './registry';

// Layout details found by testing 25 banks' statement shapes (viewed as public
// sample images; every value here is made up). Each test is one detail.

type Opts = {
  labels?: string[]; // header labels at x = 20, 90, then amount columns
  zeroFill?: boolean; // "0.00" in the empty withdrawal/deposit cell
  rupee?: boolean; // "₹" before every amount
  dash?: boolean; // "-" in the empty cell
  pageTotal?: boolean; // a "Page Total:" line under the last row, in the narration column
  opening?: string; // opening-balance line text
};

const ROWS = [
  { desc: 'UPI/1/GROCER', amount: 350, credit: false },
  { desc: 'NEFT SALARY', amount: 20000, credit: true },
  { desc: 'ATM CASH', amount: 2000, credit: false },
  { desc: 'UPI/2/PHARMACY', amount: 480.5, credit: false },
  { desc: 'INTEREST', amount: 12.25, credit: true },
];
const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function page(o: Opts = {}): PageContent[] {
  const items: TextItem[] = [];
  let y = 700;
  const put = (x: number, str: string) => items.push({ str, x, y, width: str.length * 4, height: 7 });
  const right = (edge: number, str: string) => put(edge - str.length * 4, str);
  const sign = (s: string) => (o.rupee ? `₹${s}` : s);
  put(20, o.opening ?? 'Opening Balance 5,000.00');
  y -= 20;
  (o.labels ?? ['Date', 'Narration', 'Withdrawal', 'Deposit', 'Balance']).forEach((l, i) => put([20, 90, 360, 440, 520][i], l));
  y -= 16;
  let balance = 5000;
  for (const row of ROWS) {
    balance += row.credit ? row.amount : -row.amount;
    put(20, `${String(ROWS.indexOf(row) + 2).padStart(2, '0')}/04/2024`);
    put(90, row.desc);
    const empty = o.zeroFill ? sign('0.00') : o.dash ? '-' : '';
    right(400, row.credit ? empty : sign(money(row.amount)));
    right(480, row.credit ? sign(money(row.amount)) : empty);
    right(560, sign(money(balance)));
    y -= 16;
  }
  if (o.pageTotal) {
    put(90, 'Page Total:');
    right(400, money(2830.5));
    right(480, money(20012.25));
    right(560, money(balance));
  }
  return [{ pageNumber: 1, items }];
}

const verified = { verified: true, rowsInPdf: 5, rowsRead: 5, unreadDates: [], mismatchDates: [] };

test('"0.00" in the empty cell (Yes Bank, Bank of Maharashtra, Bandhan)', () => {
  const s = parseStatement(page({ zeroFill: true }));
  expect(s.coverage).toMatchObject(verified);
  expect(s.transactions.map((t) => [t.withdrawal, t.deposit])).toEqual([[350, null], [null, 20000], [2000, null], [480.5, null], [null, 12.25]]);
});

test('a rupee sign before every amount (PNB, Punjab & Sind)', () => {
  expect(parseStatement(page({ rupee: true, dash: true })).coverage).toMatchObject(verified);
});

test('"-" in the empty cell (Indian Bank, Central Bank, Punjab & Sind)', () => {
  expect(parseStatement(page({ dash: true })).coverage).toMatchObject(verified);
});

test('"Details" and "Withdraw" headings (Central Bank, Punjab & Sind)', () => {
  const s = parseStatement(page({ labels: ['Date', 'Details', 'Withdraw', 'Credit', 'Closing Balance'] }));
  expect(s.coverage).toMatchObject({ ...verified, layout: 'header' });
});

test('a "Page Total:" line under the last row is not part of it (South Indian Bank)', () => {
  const s = parseStatement(page({ pageTotal: true }));
  expect(s.coverage).toMatchObject(verified);
  expect(s.closingBalance).toBe(22181.75);
  expect(s.transactions[4]).toMatchObject({ deposit: 12.25, balance: 22181.75 });
});

test('an opening balance followed by Dr is an overdrawn account (Federal cash credit)', () => {
  const s = parseStatement(page({ opening: 'Opening Balance 5,000.00 Dr' }));
  expect(s.openingBalance).toBe(-5000);
});

describe('bank named from the header, longest name first', () => {
  const named = (name: string) => {
    const pages = page();
    pages[0].items.push({ str: name, x: 20, y: 760, width: 100, height: 8 });
    return parseStatement(pages).bank;
  };
  test.each([
    ['South Indian Bank', 'South Indian Bank'],
    ['Indian Bank', 'Indian Bank'],
    ['Central Bank of India', 'Central Bank of India'],
    ['Bank of India', 'Bank of India'],
    ['State Bank of India', 'State Bank of India'],
    ['Punjab & Sind Bank', 'Punjab & Sind Bank'],
  ])('%s', (header, expected) => expect(named(header)).toBe(expected));
});
