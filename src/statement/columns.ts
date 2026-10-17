import { PageContent, TextItem } from '../pdf/types';
import { classifyDescription, cleanDescription } from './descriptions';
import { groupIntoLines } from './lines';
import { CARRY_ROW, isNewestFirst, parseAmount, parseDate, parseRow, rowStartDate } from './rowParsing';
import { Coverage, Line, Transaction } from './types';

// Reads the transaction table by its columns instead of one text line at a
// time. Real statements wrap a narration over 2-4 lines and print the amounts
// a few points above or below the date, so a row is everything from one date
// down to the next (a "band"), and an amount's column — found from the header
// — says whether it is a withdrawal, a deposit or the balance.

// Right edges of the amount columns (amounts are right-aligned) and where the
// date column starts.
type Columns = { dateX: number; debit: number; credit: number; balance: number };

const LABEL = {
  date: /date/i,
  narration: /narration|particulars|description|remarks/i,
  debit: /withdrawal|debit|^dr\.?$/i,
  credit: /deposit|credit|^cr\.?$/i,
  balance: /balance|^bal\.?$/i,
};
const SUMMARY_LINE = /total|opening/i;
// Text after the last row that can sit inside the narration column.
export const END_OF_TABLE = /statement summary|opening balance|closing bal|^\s*total\b|generated on|computer generated/i;
// "8,000" | "4,650.00" | "4,650.00 Cr"
const AMOUNT = /^(\d[\d,]*(?:\.\d{1,2})?)(?:\s*(Dr|Cr)\.?)?$/i;
export const DRCR = /^(Dr|Cr)\.?$/i;
const EDGE_TOLERANCE = 30; // pt between a value's right edge and its column's
const DATE_TOLERANCE = 20; // pt a row's first item may sit right of the date column
const ABOVE = 3; // pt an amount may sit above its date and still belong to it
const BALANCE_TOLERANCE = 0.01;

export function rightEdge(item: TextItem): number {
  return item.x + item.width;
}

function findHeader(lines: Line[]): { columns: Columns; y: number } | null {
  for (const line of lines) {
    if (SUMMARY_LINE.test(line.text)) continue;
    const find = (re: RegExp) => line.items.find((item) => re.test(item.str));
    const narration = find(LABEL.narration);
    const debit = find(LABEL.debit);
    const credit = find(LABEL.credit);
    const balance = find(LABEL.balance);
    if (!narration || !debit || !credit || !balance) continue;
    if (new Set([narration, debit, credit, balance]).size < 4) continue;
    const date = find(LABEL.date);
    return {
      y: line.y,
      columns: {
        dateX: date && date.x < narration.x ? date.x : line.items[0].x,
        debit: rightEdge(debit),
        credit: rightEdge(credit),
        balance: rightEdge(balance),
      },
    };
  }
  return null;
}

export type Band = { date: string; x: number; lines: Line[] };

export type Amounts = { debit: number[]; credit: number[]; balance: number[] };

function amountsIn(band: Band, columns: Columns): Amounts {
  const found: Amounts = { debit: [], credit: [], balance: [] };
  for (const line of band.lines) {
    line.items.forEach((item, i) => {
      const m = item.str.trim().match(AMOUNT);
      if (!m) return;
      const edge = rightEdge(item);
      const column = (['debit', 'credit', 'balance'] as const).reduce((best, c) =>
        Math.abs(columns[c] - edge) < Math.abs(columns[best] - edge) ? c : best
      );
      if (Math.abs(columns[column] - edge) > EDGE_TOLERANCE) return;
      // pdf.js puts blank spacer items between runs; skip them.
      const next = line.items.slice(i + 1).find((other) => other.str.trim());
      const suffix = m[2] ?? (next && next.x - edge < EDGE_TOLERANCE ? next.str.trim().match(DRCR)?.[1] : undefined);
      const value = parseAmount(m[1]);
      found[column].push(column === 'balance' && suffix?.toLowerCase() === 'dr' ? -value : value);
    });
  }
  return found;
}

// The anchor line's description exactly as the line parser reads it (so
// transaction ids and dedupe keys don't change), else the narration text the
// band starts with.
const descriptions = new WeakMap<Band, string>();
function describe(band: Band): string {
  const cached = descriptions.get(band);
  if (cached !== undefined) return cached;
  const text = cleanDescription(readDescription(band));
  descriptions.set(band, text);
  return text;
}

function readDescription(band: Band): string {
  const first = parseRow(band.lines[0].text);
  if (first) return first.description;
  for (const line of band.lines) {
    const words = line.items
      .map((item) => item.str.trim())
      .filter((str) => str && !AMOUNT.test(str) && !DRCR.test(str) && !parseDate(str));
    if (words.length) return words.join(' ').replace(/^\d+\s+/, '');
  }
  return '';
}

export type ColumnRead = { transactions: Transaction[]; openingBalance: number; coverage: Coverage };

// Rows on one page's table body: each starts at a line beginning with a date
// in the date column and takes the lines below it until the next row, a line
// starting in the date column (footer, summary) or end-of-table text.
export function bandsOn(body: Line[], dateX: number): Band[] {
  const bands: Band[] = [];
  let band: Band | null = null;
  for (const line of body) {
    const date = rowStartDate(line.text);
    const startX = line.items[0].x;
    if (date && startX <= dateX + DATE_TOLERANCE) {
      band = { date, x: startX, lines: [line] };
      bands.push(band);
      continue;
    }
    if (!band) continue; // between the header and the first row
    if (startX < band.x + 10 || END_OF_TABLE.test(line.text)) {
      band = null;
      continue;
    }
    band.lines.push(line);
  }
  // Lines up to ABOVE pt over a date belong to that date's row, not the one before.
  for (let i = 1; i < bands.length; i++) {
    const anchorY = bands[i].lines[0].y;
    const previous = bands[i - 1];
    const lifted = previous.lines.filter((line, k) => k > 0 && line.y <= anchorY + ABOVE);
    if (lifted.length) {
      previous.lines = previous.lines.filter((line) => !lifted.includes(line));
      bands[i].lines.push(...lifted);
    }
  }
  return bands;
}

// Turns bands into transactions given how to find each band's amounts, and
// checks every row against the running balance (oldest first; B/F and C/F
// rows only seed the chain).
export function readBands(
  bands: Band[],
  openingBalance: number | null,
  amountsOf: (band: Band) => Amounts,
  layout: Coverage['layout']
): ColumnRead {
  const transactions: Transaction[] = [];
  const unreadDates: string[] = [];
  const mismatchDates: string[] = [];
  let opening = openingBalance;
  let previous = openingBalance;
  let carryRows = 0;
  const ordered = isNewestFirst(bands.map((band) => band.date)) ? [...bands].reverse() : bands;

  for (const band of ordered) {
    const { debit, credit, balance } = amountsOf(band);
    const description = describe(band);
    if (CARRY_ROW.test(description)) {
      // A brought/carried-forward row restates the balance; it seeds the
      // chain (and the opening balance, when the statement prints none).
      carryRows++;
      if (balance.length === 1) {
        if (opening === null && transactions.length === 0) opening = balance[0];
        previous = balance[0];
      }
      continue;
    }
    if (balance.length !== 1 || debit.length + credit.length !== 1) {
      unreadDates.push(band.date);
      if (balance.length === 1) previous = balance[0];
      continue;
    }
    const withdrawal = debit[0] ?? null;
    const deposit = credit[0] ?? null;
    if (opening === null) opening = previous = balance[0] + (withdrawal ?? 0) - (deposit ?? 0);
    if (previous !== null && Math.abs(previous - (withdrawal ?? 0) + (deposit ?? 0) - balance[0]) > BALANCE_TOLERANCE) {
      mismatchDates.push(band.date);
    }
    previous = balance[0];

    const { merchant, refNo } = classifyDescription(description);
    transactions.push({
      date: band.date,
      description,
      merchant,
      refNo,
      withdrawal,
      deposit,
      balance: balance[0],
      raw: band.lines[0].text,
    });
  }

  return {
    transactions,
    openingBalance: opening ?? 0,
    coverage: {
      verified: true,
      layout,
      rowsInPdf: bands.length - carryRows,
      rowsRead: transactions.length,
      unreadDates,
      mismatchDates,
    },
  };
}

// null when the statement has no recognisable table header or no dated rows;
// the caller then tries the column search, then the line parser.
export function parseByColumns(pages: PageContent[], openingBalance: number | null): ColumnRead | null {
  let columns: Columns | null = null;
  const bands: Band[] = [];
  for (const page of pages) {
    const lines = groupIntoLines(page.items);
    const header = findHeader(lines);
    if (header) columns = header.columns; // later pages may not repeat it
    if (!columns) continue;
    bands.push(...bandsOn(header ? lines.filter((line) => line.y < header.y) : lines, columns.dateX));
  }
  if (!columns || bands.length === 0) return null;
  const found = columns;
  return readBands(bands, openingBalance, (band) => amountsIn(band, found), 'header');
}
