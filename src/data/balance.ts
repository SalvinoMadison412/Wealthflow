// Pure — no expo-sqlite import, unit tested directly.

export type AccountMonth = { inflows: number; outflows: number; closing: number };
export type BalanceSummaryData = { opening: number; inflows: number; outflows: number; closing: number };

// Opening is derived per account as closing - inflows + outflows, so
// opening + inflows - outflows === closing always holds after summing.
export function combineAccountMonths(rows: AccountMonth[]): BalanceSummaryData | null {
  if (rows.length === 0) return null;
  const total = { opening: 0, inflows: 0, outflows: 0, closing: 0 };
  for (const r of rows) {
    total.opening += r.closing - r.inflows + r.outflows;
    total.inflows += r.inflows;
    total.outflows += r.outflows;
    total.closing += r.closing;
  }
  return total;
}
