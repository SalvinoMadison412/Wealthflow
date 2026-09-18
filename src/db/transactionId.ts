// Pure ID-generation logic — no expo-sqlite import, so it can be unit
// tested directly (expo-sqlite's native binding isn't available under
// Jest; see docs/REDESIGN_PLAN.md PR 2 for why the DB layer itself isn't
// unit tested).

// Deterministic and collision-free by construction, not a hash: the same
// statement re-imported produces the same transaction ids, so `INSERT OR
// IGNORE` is a correct re-import dedupe with no separate lookup needed.
export function makeTransactionId(input: {
  accountId: string;
  date: string;
  withdrawal: number | null;
  deposit: number | null;
  balance: number;
  refNo: string | null;
  description: string;
}): string {
  const amount = (n: number | null) => (n == null ? '' : n.toFixed(2));
  const description = input.description.trim().replace(/\s+/g, ' ');
  return [
    input.accountId,
    input.date,
    amount(input.withdrawal),
    amount(input.deposit),
    input.balance.toFixed(2),
    input.refNo ?? '',
    description,
  ].join('|');
}

// The uniqueness benchmark for a transaction: NO account in it, so the same
// transaction imported three or four times (re-import, or the same statement
// added under another account) is stored once. Bank reference when the
// statement has one (Kotak UPI) — direction is included because both legs of
// a transfer between your own accounts share a reference. Otherwise date +
// amounts + running balance + description, which is unique within a
// statement. Backed by a UNIQUE index (schema v3).
export function makeDedupeKey(input: {
  date: string;
  withdrawal: number | null;
  deposit: number | null;
  balance: number;
  refNo: string | null;
  description: string;
}): string {
  const amount = (n: number | null) => (n == null ? '' : n.toFixed(2));
  if (input.refNo) {
    const debit = input.withdrawal != null && input.withdrawal > 0;
    return ['ref', input.refNo, debit ? 'W' : 'D', amount(debit ? input.withdrawal : input.deposit), input.date].join('|');
  }
  const description = input.description.trim().replace(/\s+/g, ' ');
  return ['row', input.date, amount(input.withdrawal), amount(input.deposit), input.balance.toFixed(2), description].join('|');
}

// Rule/category ids — good enough uniqueness for user-authored rows
// created one at a time by a single device; not a UUID library.
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
