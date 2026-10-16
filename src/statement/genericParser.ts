import { PageContent } from '../pdf/types';
import { classifyDescription } from './descriptions';
import { groupIntoLines } from './lines';
import {
  inferAmounts,
  LEADING_AMOUNT_REGEX,
  OPENING_BALANCE_LABEL_REGEX,
  OPENING_BALANCE_REGEX,
  parseAmount,
  parseRow,
} from './rowParsing';
import { ParsedStatement, Transaction } from './types';

const VALUE_DATE_SUFFIX = /\s*\(Value Date:[^)]*\)\s*$/i;

// One parser for every bank: rows are recognised by shape (see rowParsing),
// not by a per-bank template. The bank is named separately (registry.ts).
export function parseGeneric(pages: PageContent[]): ParsedStatement {
  const transactions: Transaction[] = [];
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

      const row = parseRow(text);
      if (!row) continue;

      const description = row.description.replace(VALUE_DATE_SUFFIX, '');
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

  return {
    openingBalance: seenOpeningBalance ? openingBalance : transactions[0]?.balance ?? 0,
    closingBalance: transactions[transactions.length - 1]?.balance ?? previousBalance,
    transactions,
  };
}
