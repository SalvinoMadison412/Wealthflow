import { ParsedStatement, ReconciliationResult } from './types';

const TOLERANCE = 0.01;

// The correctness check for parsing, per CLAUDE.md: opening balance +
// sum(credits) - sum(debits) must equal the closing balance.
export function reconcile(statement: ParsedStatement): ReconciliationResult {
  const { openingBalance, closingBalance, transactions } = statement;
  const credits = transactions.reduce((sum, t) => sum + (t.deposit ?? 0), 0);
  const debits = transactions.reduce((sum, t) => sum + (t.withdrawal ?? 0), 0);
  const expectedClosing = openingBalance + credits - debits;
  const delta = Math.round((expectedClosing - closingBalance) * 100) / 100;

  return {
    ok: Math.abs(delta) <= TOLERANCE,
    expectedClosing,
    actualClosing: closingBalance,
    delta,
  };
}
