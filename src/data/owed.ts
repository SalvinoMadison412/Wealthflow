// Money someone owes you ('to_me') or you owe ('by_me'), tagged per
// transaction with a person and an amount. A note on a transaction: it never
// changes spending totals or reconciliation.

export type OwedDirection = 'to_me' | 'by_me';

export type OwedRow = {
  id: string;
  person: string;
  amount: number;
  settledAt: string | null;
  merchant: string;
  date: string;
};

export type OwedDraft = { person: string; amount: string };

const SLOP = 0.005;

// Each person named, each amount > 0, and together no more than the
// transaction (a split bill: paid ₹1,200, two friends owe ₹400 each).
export function validateOwedSplit(
  drafts: OwedDraft[],
  transactionAmount: number
): { ok: true; entries: { person: string; amount: number }[] } | { ok: false; error: string } {
  const entries: { person: string; amount: number }[] = [];
  for (const d of drafts) {
    const person = d.person.trim();
    const amount = Number(d.amount.replace(/,/g, ''));
    if (!person) return { ok: false, error: 'Enter a name' };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter an amount above zero' };
    entries.push({ person, amount });
  }
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  if (total > transactionAmount + SLOP) return { ok: false, error: 'The amounts add up to more than this transaction' };
  return { ok: true, entries };
}

export type PersonGroup = { person: string; outstanding: number; rows: OwedRow[] };

// Same person, spelled differently in case or spacing, is one group. People
// with something outstanding come first (largest first); within a person,
// unsettled rows come before settled ones. Fully settled people sink last.
export function groupByPerson(rows: OwedRow[]): PersonGroup[] {
  const map = new Map<string, PersonGroup>();
  for (const row of rows) {
    const key = row.person.trim().toLowerCase();
    const group = map.get(key) ?? { person: row.person.trim(), outstanding: 0, rows: [] };
    group.rows.push(row);
    if (row.settledAt === null) group.outstanding += row.amount;
    map.set(key, group);
  }
  const groups = [...map.values()];
  for (const g of groups) g.rows.sort((a, b) => Number(a.settledAt !== null) - Number(b.settledAt !== null) || (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  return groups.sort((a, b) => Number(a.outstanding === 0) - Number(b.outstanding === 0) || b.outstanding - a.outstanding);
}

// A debit is usually money paid out for someone; a credit, money received for them.
export function defaultDirection(isDebit: boolean): OwedDirection {
  return isDebit ? 'to_me' : 'by_me';
}
