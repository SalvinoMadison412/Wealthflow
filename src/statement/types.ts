import { TextItem } from '../pdf/types';

export type Transaction = {
  date: string; // ISO yyyy-mm-dd
  description: string;
  merchant: string;
  refNo: string | null;
  withdrawal: number | null;
  deposit: number | null;
  balance: number;
  raw: string;
};

export type ParsedStatement = {
  openingBalance: number;
  closingBalance: number;
  transactions: Transaction[];
  // Set by the registry when a bank-specific template matched (e.g. "Kotak
  // Mahindra Bank"); undefined for the generic fallback, which has no way
  // to know the issuing bank. Masked account numbers aren't extracted —
  // nothing in the current parsers reads the statement header, only the
  // transaction table — so the user names/identifies the account by hand
  // in the Import screen's account chooser.
  bank?: string;
  coverage: Coverage;
};

// Proof that every transaction row in the PDF was read: rowsInPdf counts the
// dated rows found on the page, rowsRead the ones turned into transactions.
// A mismatch is a read row whose balance doesn't follow from the previous one
// (previous balance - withdrawal + deposit), so a skipped or misread row shows.
export type Coverage = {
  // True when each row's withdrawal/deposit came from its column, so the
  // balance check can catch a misread row. The line reader works direction
  // out from the balance itself, so its rows always "follow": unverified.
  verified: boolean;
  rowsInPdf: number;
  rowsRead: number;
  unreadDates: string[];
  mismatchDates: string[];
};

export type ReconciliationResult = {
  ok: boolean;
  expectedClosing: number;
  actualClosing: number;
  delta: number;
};

export type Line = {
  y: number;
  items: TextItem[]; // left to right
  text: string;
};

export type { TextItem };
