// Pure — no expo-sqlite import, unit tested directly (see
// db/transactionId.ts for why the DB layer itself isn't).

export type Bucket = 'needs' | 'wants' | 'savings';

export type Preset = { needs: number; wants: number; savings: number };

export const PRESETS: Record<'50/30/20' | '60/20/20', Preset> = {
  '50/30/20': { needs: 50, wants: 30, savings: 20 },
  '60/20/20': { needs: 60, wants: 20, savings: 20 },
};

export function isValidPreset(preset: Preset): boolean {
  const { needs, wants, savings } = preset;
  return needs >= 0 && wants >= 0 && savings >= 0 && needs + wants + savings === 100;
}

// The planned rupee amount for one bucket: income * percentage.
export function planned(income: number, pct: number): number {
  return (income * pct) / 100;
}

export type CategorySpend = { bucket: Bucket; spent: number };

// Actual spend per bucket, summed from each category's spend and its
// assigned bucket — the donut's "actual" ring and the three bucket rows.
export function bucketTotals(rows: CategorySpend[]): Record<Bucket, number> {
  const totals: Record<Bucket, number> = { needs: 0, wants: 0, savings: 0 };
  for (const row of rows) totals[row.bucket] += row.spent;
  return totals;
}

export type ProgressState = 'under' | 'warning' | 'over';

// under 80%: accent, 80-100%: warning, over 100%: over (expense color) —
// the category progress bars' color rule. A category with spend but no
// budget set is always "over" (nothing to measure against but spending
// happened); a category with neither is "under" (nothing to show).
export function progressState(spent: number, budget: number): ProgressState {
  if (budget <= 0) return spent > 0 ? 'over' : 'under';
  const pct = (spent / budget) * 100;
  if (pct > 100) return 'over';
  if (pct >= 80) return 'warning';
  return 'under';
}

// The progress bar's fill width as a 0-100 percentage, capped at 100 even
// when over budget (the color, not an overflowing bar, signals "over").
export function progressPercent(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 100 : 0;
  return Math.min((spent / budget) * 100, 100);
}
