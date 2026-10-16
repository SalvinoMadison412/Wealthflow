import { PageContent } from '../pdf/types';
import { parseGeneric } from './genericParser';
import { groupIntoLines } from './lines';
import { parseRow } from './rowParsing';
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

export function parseStatement(pages: PageContent[]): ParsedStatement {
  return { ...parseGeneric(pages), bank: detectBank(pages) };
}
