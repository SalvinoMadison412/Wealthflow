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


// Rule/category ids — good enough uniqueness for user-authored rows
// created one at a time by a single device; not a UUID library.
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
