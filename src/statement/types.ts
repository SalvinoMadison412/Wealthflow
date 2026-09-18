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
};

export type ReconciliationResult = {
  ok: boolean;
  expectedClosing: number;
  actualClosing: number;
  delta: number;
};

export type Line = {
  y: number;
  text: string;
};

export type { TextItem };
