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
