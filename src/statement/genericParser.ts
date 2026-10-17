import { PageContent } from '../pdf/types';
import { searchColumns } from './columnSearch';
import { parseByColumns } from './columns';
import { classifyDescription, cleanDescription } from './descriptions';
import { groupIntoLines } from './lines';
import {
  CARRY_ROW,
  CLOSING_BALANCE_REGEX,
  inferAmounts,
  isNewestFirst,
  LEADING_AMOUNT_REGEX,
  OPENING_BALANCE_LABEL_REGEX,
  OPENING_BALANCE_REGEX,
  parseAmount,
  ParsedRow,
  parseRow,
  rowStartDate,
  TRAILING_BALANCE_REGEX,
} from './rowParsing';
import { ParsedStatement, Transaction } from './types';

// The opening balance, on the same line as its label or (summary blocks) on
// the line below; null when the statement doesn't print one.
function findOpeningBalance(pages: PageContent[]): number | null {
  for (const page of pages) {
    const lines = groupIntoLines(page.items);
    for (let i = 0; i < lines.length; i++) {
      const same = lines[i].text.match(OPENING_BALANCE_REGEX);
      if (same) return parseAmount(same[1]);
      const below = OPENING_BALANCE_LABEL_REGEX.test(lines[i].text) && lines[i + 1]?.text.match(LEADING_AMOUNT_REGEX);
      if (below) return parseAmount(below[1]);
    }
  }
  return null;
}

// One parser for every bank. A statement with a recognisable table header is
// read by its columns (columns.ts); otherwise one text line at a time, rows
// recognised by shape (rowParsing.ts). The bank is named separately
// (registry.ts).
// The closing balance when a line prints it beside its label; null otherwise.
function findClosingBalance(pages: PageContent[]): number | null {
  for (const page of pages) {
    for (const line of groupIntoLines(page.items)) {
      const m = line.text.match(CLOSING_BALANCE_REGEX);
      if (m) return parseAmount(m[1]);
    }
  }
  return null;
}

export function parseGeneric(pages: PageContent[]): ParsedStatement {
  const opening = findOpeningBalance(pages);
  const columnar = parseByColumns(pages, opening) ?? searchColumns(pages, opening, findClosingBalance(pages));
  if (columnar) {
    const { transactions, openingBalance, coverage } = columnar;
    return {
      openingBalance,
      closingBalance: transactions[transactions.length - 1]?.balance ?? openingBalance,
      transactions,
      coverage,
    };
  }
  return parseByLines(pages);
}

type LineEvent =
  | { kind: 'opening'; value: number }
  | { kind: 'carry'; balance: number | null }
  | { kind: 'row'; row: ParsedRow; text: string };

function parseByLines(pages: PageContent[]): ParsedStatement {
  let events: LineEvent[] = [];
  const unreadDates: string[] = [];
  let rowsInPdf = 0;

  for (const page of pages) {
    const lines = groupIntoLines(page.items);
    for (let i = 0; i < lines.length; i++) {
      const { text } = lines[i];
      const openingMatch = text.match(OPENING_BALANCE_REGEX);
      const openingBelow =
        !openingMatch && OPENING_BALANCE_LABEL_REGEX.test(text) ? lines[i + 1]?.text.match(LEADING_AMOUNT_REGEX) : null;
      const opening = openingMatch ?? openingBelow;
      if (opening) {
        events.push({ kind: 'opening', value: parseAmount(opening[1]) });
        if (openingBelow) i++;
        continue;
      }

      const startDate = rowStartDate(text);
      if (startDate && CARRY_ROW.test(text)) {
        const carried = text.match(TRAILING_BALANCE_REGEX);
        const value = carried && parseAmount(carried[1]) * (carried[2]?.toLowerCase() === 'dr' ? -1 : 1);
        events.push({ kind: 'carry', balance: carried ? value : null });
        continue;
      }
      if (startDate) rowsInPdf++;
      const row = parseRow(text);
      if (!row) {
        if (startDate) unreadDates.push(startDate);
        continue;
      }
      events.push({ kind: 'row', row, text });
    }
  }

  // Newest-first statements: the printed opening balance still comes first,
  // then the rows (and brought/carried-forward rows) bottom-up.
  const rowDates = events.flatMap((e) => (e.kind === 'row' ? [e.row.date] : []));
  if (isNewestFirst(rowDates)) {
    events = [...events.filter((e) => e.kind === 'opening'), ...events.filter((e) => e.kind !== 'opening').reverse()];
    unreadDates.reverse();
  }

  const transactions: Transaction[] = [];
  let openingBalance = 0;
  let previousBalance = 0;
  let seenOpeningBalance = false;
  for (const event of events) {
    if (event.kind === 'opening') {
      openingBalance = previousBalance = event.value;
      seenOpeningBalance = true;
      continue;
    }
    if (event.kind === 'carry') {
      if (event.balance === null) continue;
      if (!seenOpeningBalance && transactions.length === 0) {
        openingBalance = event.balance;
        seenOpeningBalance = true;
      }
      previousBalance = event.balance;
      continue;
    }
    const { row, text } = event;
    const description = cleanDescription(row.description);
    const { withdrawal, deposit } = inferAmounts(row.amount, row.balance, previousBalance);
    const { merchant, refNo } = classifyDescription(description);
    transactions.push({
      date: row.date,
      description,
      merchant,
      refNo,
      withdrawal,
      deposit,
      balance: row.balance,
      raw: text,
    });
    previousBalance = row.balance;
  }

  // Direction here comes from the balance movement, so the check below can
  // only catch skipped rows, never a misread one: coverage is unverified.
  // Without a printed opening balance the first row is the baseline.
  const mismatchDates: string[] = [];
  let previous: number | null = seenOpeningBalance ? openingBalance : null;
  for (const t of transactions) {
    if (previous !== null && Math.abs(previous - (t.withdrawal ?? 0) + (t.deposit ?? 0) - t.balance) > 0.01) {
      mismatchDates.push(t.date);
    }
    previous = t.balance;
  }

  return {
    openingBalance: seenOpeningBalance ? openingBalance : transactions[0]?.balance ?? 0,
    closingBalance: transactions[transactions.length - 1]?.balance ?? previousBalance,
    transactions,
    coverage: {
      verified: false,
      layout: 'lines',
      rowsInPdf: Math.max(rowsInPdf, transactions.length),
      rowsRead: transactions.length,
      unreadDates,
      mismatchDates,
    },
  };
}
