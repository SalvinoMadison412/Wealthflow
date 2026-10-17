import { PageContent, TextItem } from '../pdf/types';
import { parseStatement } from './registry';

// Adversarial layouts the header reader cannot place. Pages are built as
// pdf.js text items with amounts right-aligned, as real PDFs print them.

type Row = { day: number; desc: string; amount: number; credit: boolean };

const BASE: Row[] = [
  { day: 2, desc: 'UPI/123456789012/GROCER/Pay', amount: 350, credit: false },
  { day: 4, desc: 'NEFT ACME CORP SALARY', amount: 20000, credit: true },
  { day: 9, desc: 'ATM CASH WITHDRAWAL', amount: 2000, credit: false },
  { day: 15, desc: 'UPI/223456789012/PHARMACY/Pay', amount: 480.5, credit: false },
  { day: 21, desc: 'INTEREST CREDIT', amount: 12.25, credit: true },
  { day: 28, desc: 'UPI/323456789012/RENT/Pay', amount: 9000, credit: false },
];

const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Layout = {
  header?: string[]; // labels at x 20, 90, then amount columns
  // amount cells right-aligned at these right edges: debit, credit, balance
  columns: 'separate' | 'typed' | 'signed';
  cumulative?: boolean; // an extra running total of deposits (only for all-credit rows)
  closing?: string;
};

function pages(rows: Row[], layout: Layout, opening = 5000): PageContent[] {
  const items: TextItem[] = [];
  let y = 700;
  const put = (x: number, str: string) => items.push({ str, x, y, width: str.length * 4, height: 7 });
  const right = (edge: number, str: string) => put(edge - str.length * 4, str);
  put(20, '01/03/2026 to 31/03/2026'); // statement period: dated, but not a row
  y -= 20;
  put(20, 'Opening Balance');
  put(150, money(opening));
  y -= 20;
  if (layout.header) {
    layout.header.forEach((label, i) => put([20, 90, 360, 440, 520, 600][i], label));
    y -= 16;
  }
  let balance = opening;
  let deposits = 0;
  for (const row of rows) {
    balance += row.credit ? row.amount : -row.amount;
    if (row.credit) deposits += row.amount;
    put(20, `${String(row.day).padStart(2, '0')}/03/2026`);
    put(90, row.desc);
    if (layout.columns === 'separate') right(row.credit ? 470 : 400, money(row.amount));
    if (layout.columns === 'typed') {
      right(400, money(row.amount));
      put(420, row.credit ? 'Cr' : 'Dr');
    }
    if (layout.columns === 'signed') right(400, `${row.credit ? '' : '-'}${money(row.amount)}`);
    right(560, money(balance));
    if (layout.cumulative) right(640, money(deposits));
    y -= 16;
  }
  if (layout.closing) put(20, layout.closing);
  return [{ pageNumber: 1, items }];
}

function manyRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({ ...BASE[i % BASE.length], day: 1 + Math.floor((i * 27) / n) }));
}

test.each([
  ['unknown header labels', ['Txn', 'Details', 'Paid out', 'Paid in', 'Running total']],
  ['Hindi header labels', ['तिथि', 'विवरण', 'निकासी', 'जमा', 'शेष']],
  ['no header at all', undefined],
])('%s: found by the column search and verified', (_name, header) => {
  const statement = parseStatement(pages(BASE, { header, columns: 'separate' }));
  expect(statement.coverage).toEqual({
    verified: true,
    layout: 'search',
    rowsInPdf: 6,
    rowsRead: 6,
    unreadDates: [],
    mismatchDates: [],
  });
  expect(statement.transactions.map((t) => t.withdrawal)).toEqual([350, null, 2000, 480.5, null, 9000]);
  expect(statement.transactions.map((t) => t.deposit)).toEqual([null, 20000, null, null, 12.25, null]);
});

test.each([
  ['one Amount column with a Dr/Cr type column', 'typed'],
  ['one signed amount column', 'signed'],
] as const)('%s: verified', (_name, columns) => {
  const statement = parseStatement(pages(BASE, { header: ['Date', 'Particulars', 'Amount', 'Type', 'Balance'], columns }));
  expect(statement.coverage).toMatchObject({ verified: true, layout: 'search', rowsRead: 6, mismatchDates: [] });
  expect(statement.transactions[0]).toMatchObject({ withdrawal: 350, deposit: null, balance: 4650 });
});

test('fewer than four rows is too few to trust a guessed layout', () => {
  expect(parseStatement(pages(BASE.slice(0, 3), { columns: 'separate' })).coverage).toMatchObject({
    verified: false,
    layout: 'lines',
  });
});

test('two readings that both balance are ambiguous, not guessed', () => {
  // All deposits, plus a running total of deposits that also climbs by each
  // amount: either column could be the balance (they differ only by the
  // opening balance), so neither wins by a clear margin.
  const credits = BASE.map((row) => ({ ...row, credit: true }));
  expect(parseStatement(pages(credits, { columns: 'separate', cumulative: true })).coverage.layout).toBe('lines');
});

test('a printed closing balance that the rows do not reach is rejected', () => {
  const statement = parseStatement(pages(BASE, { columns: 'separate', closing: 'Closing Balance 9,999.00' }));
  expect(statement.coverage.layout).toBe('lines');
});

test('a balance that breaks the chain inside an accepted search is still flagged', () => {
  const page = pages(manyRows(25), { columns: 'separate' });
  // Nudge the 10th row's balance by one rupee.
  const balances = page[0].items.filter((item) => item.x + item.width === 560);
  const tenth = balances[10];
  const value = Number(tenth.str.replace(/,/g, '')) + 1;
  tenth.str = money(value);
  tenth.x = 560 - tenth.str.length * 4;
  const { coverage } = parseStatement(page);
  expect(coverage).toMatchObject({ verified: true, layout: 'search', rowsInPdf: 25, rowsRead: 25 });
  expect(coverage.mismatchDates).toHaveLength(2);
});
