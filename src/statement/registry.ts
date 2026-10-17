import { PageContent } from '../pdf/types';
import { parseGeneric } from './genericParser';
import { groupIntoLines } from './lines';
import { DATE, parseDate, parseRow } from './rowParsing';
import { ParsedStatement } from './types';

const BANKS: [pattern: RegExp, name: string][] = [
  [/kotak mahindra/i, 'Kotak Mahindra Bank'],
  [/state bank of india/i, 'State Bank of India'],
  [/hdfc bank/i, 'HDFC Bank'],
  [/icici bank/i, 'ICICI Bank'],
  [/axis bank/i, 'Axis Bank'],
  [/punjab national bank/i, 'Punjab National Bank'],
  [/bank of baroda/i, 'Bank of Baroda'],
  [/canara bank/i, 'Canara Bank'],
  [/union bank of india/i, 'Union Bank of India'],
  [/indusind bank/i, 'IndusInd Bank'],
  [/yes bank/i, 'Yes Bank'],
  [/idfc first/i, 'IDFC FIRST Bank'],
  [/central bank of india/i, 'Central Bank of India'],
  [/bank of india/i, 'Bank of India'], // after State, Union and Central Bank of India
  [/indian overseas bank/i, 'Indian Overseas Bank'],
  [/uco bank/i, 'UCO Bank'],
  [/bank of maharashtra/i, 'Bank of Maharashtra'],
  [/punjab\s*(?:&|and)\s*sind bank/i, 'Punjab & Sind Bank'],
  [/federal bank/i, 'Federal Bank'],
  [/idbi bank/i, 'IDBI Bank'],
  [/bandhan bank/i, 'Bandhan Bank'],
  [/au small finance/i, 'AU Small Finance Bank'],
  [/rbl bank/i, 'RBL Bank'],
  [/south indian bank/i, 'South Indian Bank'],
  [/indian bank/i, 'Indian Bank'], // after South Indian Bank, which contains it
];

// Only text outside the transaction rows counts: narrations name other banks
// ("UPI to HDFC BANK"). A statement that never names its bank (a logo
// image) gets none, and the user types it in the account chooser.
function detectBank(pages: PageContent[]): string | undefined {
  for (const page of pages) {
    for (const line of groupIntoLines(page.items)) {
      if (parseRow(line.text)) continue;
      const hit = BANKS.find(([pattern]) => pattern.test(line.text));
      if (hit) return hit[1];
    }
  }
  return undefined;
}

// "Statement period: 01-10-2026 to 15-10-2026", "From 01 Oct 2026 To 15 Oct 2026".
const PERIOD = new RegExp(`(?:period|from)\\b[^\\d]{0,24}(${DATE})\\s*(?:to|till|-|–)\\s*:?\\s*(${DATE})`, 'i');

export function matchPeriod(text: string): { start: string; end: string } | undefined {
  const m = text.match(PERIOD);
  const start = m && parseDate(m[1]);
  const end = m && parseDate(m[2]);
  return start && end && start <= end ? { start, end } : undefined;
}

// The printed period, searched outside the transaction rows like the bank
// name. Rejected unless every row date sits inside it: a misread header must
// not shrink or stretch what the statement covers.
function detectPeriod(pages: PageContent[], rowDates: string[]): { start: string; end: string } | undefined {
  for (const page of pages) {
    for (const line of groupIntoLines(page.items)) {
      if (parseRow(line.text)) continue;
      const period = matchPeriod(line.text);
      if (period) return rowDates.every((d) => d >= period.start && d <= period.end) ? period : undefined;
    }
  }
  return undefined;
}

export function parseStatement(pages: PageContent[]): ParsedStatement {
  const parsed = parseGeneric(pages);
  const rowDates = parsed.transactions.map((t) => t.date);
  return { ...parsed, bank: detectBank(pages), period: detectPeriod(pages, rowDates) };
}
