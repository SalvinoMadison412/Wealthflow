import { PageContent } from '../pdf/types';
import { canonicalMerchantName } from './merchantNames';
import { groupIntoLines } from './lines';
import {
  inferAmounts,
  OPENING_BALANCE_REGEX,
  parseAmount,
  parseStatementDate,
  ROW_REGEX,
} from './rowParsing';
import { ParsedStatement, Transaction } from './types';

// Fallback for a bank layout no registered template recognizes. Same
// row/opening-balance shape as Kotak's (# | date | description | ... two
// trailing amounts), just without any keyword-based description cleanup —
// the raw description is all we can offer without knowing the bank's format.
export function parseGeneric(pages: PageContent[]): ParsedStatement {
  const transactions: Transaction[] = [];
  let openingBalance = 0;
  let previousBalance = 0;
  let seenOpeningBalance = false;

  for (const page of pages) {
    for (const line of groupIntoLines(page.items)) {
      const openingMatch = line.text.match(OPENING_BALANCE_REGEX);
      if (openingMatch) {
        openingBalance = parseAmount(openingMatch[1]);
        previousBalance = openingBalance;
        seenOpeningBalance = true;
        continue;
      }

      const rowMatch = line.text.match(ROW_REGEX);
      if (!rowMatch) continue;

      const [, dateRaw, descriptionRaw, amountRaw, balanceRaw] = rowMatch;
      const description = descriptionRaw.trim();
      const balance = parseAmount(balanceRaw);
      const amount = parseAmount(amountRaw);
      const { withdrawal, deposit } = inferAmounts(amount, balance, previousBalance);

      transactions.push({
        date: parseStatementDate(dateRaw),
        description,
        merchant: canonicalMerchantName(description),
        refNo: null,
        withdrawal,
        deposit,
        balance,
        raw: line.text,
      });

      previousBalance = balance;
    }
  }

  return {
    openingBalance: seenOpeningBalance ? openingBalance : transactions[0]?.balance ?? 0,
    closingBalance: transactions[transactions.length - 1]?.balance ?? previousBalance,
    transactions,
  };
}
