import { PageContent } from '../pdf/types';
import { parseByColumns } from './columns';
import { classifyDescription, cleanDescription } from './descriptions';
import { groupIntoLines } from './lines';
import {
  inferAmounts,
  LEADING_AMOUNT_REGEX,
  OPENING_BALANCE_LABEL_REGEX,
  OPENING_BALANCE_REGEX,
  parseAmount,
  parseRow,
  rowStartDate,
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
export function parseGeneric(pages: PageContent[]): ParsedStatement {
  const columnar = parseByColumns(pages, findOpeningBalance(pages));
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

function parseByLines(pages: PageContent[]): ParsedStatement {
  const transactions: Transaction[] = [];
  const unreadDates: string[] = [];
  let rowsInPdf = 0;
  let openingBalance = 0;
  let previousBalance = 0;
  let seenOpeningBalance = false;

  for (const page of pages) {
    const lines = groupIntoLines(page.items);
    for (let i = 0; i < lines.length; i++) {
      const { text } = lines[i];
      const openingMatch = text.match(OPENING_BALANCE_REGEX);
      const openingBelow =
        !openingMatch && OPENING_BALANCE_LABEL_REGEX.test(text) ? lines[i + 1]?.text.match(LEADING_AMOUNT_REGEX) : null;
      const opening = openingMatch ?? openingBelow;
      if (opening) {
        openingBalance = parseAmount(opening[1]);
        previousBalance = openingBalance;
        seenOpeningBalance = true;
        if (openingBelow) i++;
        continue;
      }

      const startDate = rowStartDate(text);
      if (startDate) rowsInPdf++;
      const row = parseRow(text);
      if (!row) {
        if (startDate) unreadDates.push(startDate);
        continue;
      }

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
  }

  // Direction here comes from the balance movement, so a row only fails to
  // follow from the previous one when the first row is misread or rows were
  // skipped between them; without a printed opening balance the first row is
  // the baseline.
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
    coverage: { rowsInPdf: Math.max(rowsInPdf, transactions.length), rowsRead: transactions.length, unreadDates, mismatchDates },
  };
}
