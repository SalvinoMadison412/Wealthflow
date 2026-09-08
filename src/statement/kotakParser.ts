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

const UPI_REGEX = /^UPI\/([^/]+)\/(\d{12})\/(.*)$/;
// A UPI transfer with no merchant-provided note collapses to just
// "UPI/<payee> UPI-<bankRef>" — no slash-delimited ref/note fields at all.
// Real statements mix both shapes; this is ~35% of rows in the sample one.
const UPI_SHORT_REGEX = /^UPI\/(.+?)\s+UPI-\w+$/i;
const VALUE_DATE_SUFFIX = /\s*\(Value Date:[^)]*\)\s*$/i;

function classifyDescription(raw: string): { merchant: string; refNo: string | null } {
  const upi = raw.match(UPI_REGEX);
  if (upi) {
    const [, payee, refNo] = upi;
    return { merchant: canonicalMerchantName(payee), refNo };
  }
  const upiShort = raw.match(UPI_SHORT_REGEX);
  if (upiShort) {
    return { merchant: canonicalMerchantName(upiShort[1]), refNo: null };
  }
  if (/SALARY CREDIT/i.test(raw)) {
    return { merchant: 'Salary Credit', refNo: null };
  }
  if (/Int\.Pd/i.test(raw)) {
    return { merchant: 'Interest', refNo: null };
  }
  return { merchant: canonicalMerchantName(raw), refNo: null };
}

// Kotak Mahindra Bank's statement table: # | Date | Description | Chq/Ref.
// No. | Withdrawal (Dr.) | Deposit (Cr.) | Balance. Detection is deliberately
// loose (just "does this look like our row/opening-balance shape") since the
// registry only needs a cheap yes/no before falling back to the generic
// parser.
export function canParseKotak(pages: PageContent[]): boolean {
  return pages.some((page) => {
    const lines = groupIntoLines(page.items);
    return lines.some((l) => OPENING_BALANCE_REGEX.test(l.text) || ROW_REGEX.test(l.text));
  });
}

export function parseKotak(pages: PageContent[]): ParsedStatement {
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
      const description = descriptionRaw.trim().replace(VALUE_DATE_SUFFIX, '');
      const balance = parseAmount(balanceRaw);
      const amount = parseAmount(amountRaw);
      const { withdrawal, deposit } = inferAmounts(amount, balance, previousBalance);
      const { merchant, refNo } = classifyDescription(description);

      transactions.push({
        date: parseStatementDate(dateRaw),
        description,
        merchant,
        refNo,
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
