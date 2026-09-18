// Pure — no expo-sqlite import, unit tested directly (see
// db/transactionId.ts for why the DB layer itself isn't).

export type TransferCandidate = {
  id: string;
  accountId: string;
  date: string; // ISO yyyy-mm-dd
  withdrawal: number | null;
  deposit: number | null;
};

const AMOUNT_TOLERANCE = 0.005;
const MAX_GAP_DAYS = 2;

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// Deterministic, amount+date only — no merchant/description heuristics.
// A withdrawal on one account and a deposit on a *different* account,
// equal amount (within a paisa), within 2 days, are a transfer pair.
// Greedy by nearest date gap: the closest-dated valid match wins, and
// each transaction can be claimed by at most one pair.
export function detectTransferPairs(transactions: TransferCandidate[]): [string, string][] {
  type Candidate = { withdrawalId: string; depositId: string; gapDays: number };
  const candidates: Candidate[] = [];

  for (const a of transactions) {
    if (a.withdrawal == null) continue;
    for (const b of transactions) {
      if (b.accountId === a.accountId || b.deposit == null) continue;
      if (Math.abs(a.withdrawal - b.deposit) >= AMOUNT_TOLERANCE) continue;
      const gapDays = daysBetween(a.date, b.date);
      if (gapDays > MAX_GAP_DAYS) continue;
      candidates.push({ withdrawalId: a.id, depositId: b.id, gapDays });
    }
  }

  candidates.sort((x, y) => x.gapDays - y.gapDays);

  const used = new Set<string>();
  const pairs: [string, string][] = [];
  for (const c of candidates) {
    if (used.has(c.withdrawalId) || used.has(c.depositId)) continue;
    used.add(c.withdrawalId);
    used.add(c.depositId);
    pairs.push([c.withdrawalId, c.depositId]);
  }
  return pairs;
}
