// Pure — no expo-sqlite import, unit tested directly.

export type RecurringInput = { merchant: string; month: string; amount: number };

const TOLERANCE = 0.1;

// A merchant is recurring when it shows up in 2+ distinct calendar months
// and every amount sits within ±10% of the median (rent, subscriptions,
// EMIs, salary — not a merchant with variable order values).
// ponytail: needs two months of history and assumes a fixed amount; add
// cadence detection (weekly vs monthly) only if users ask for it.
export function findRecurringMerchants(rows: RecurringInput[]): string[] {
  const byMerchant = new Map<string, RecurringInput[]>();
  for (const row of rows) {
    const list = byMerchant.get(row.merchant);
    if (list) list.push(row);
    else byMerchant.set(row.merchant, [row]);
  }

  const recurring: string[] = [];
  for (const [merchant, list] of byMerchant) {
    if (new Set(list.map((r) => r.month)).size < 2) continue;
    const sorted = list.map((r) => r.amount).sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    if (median > 0 && sorted.every((a) => Math.abs(a - median) <= median * TOLERANCE)) recurring.push(merchant);
  }
  return recurring;
}
