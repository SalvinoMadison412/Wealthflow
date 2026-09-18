// Pure — no expo-sqlite import, unit tested directly (see
// db/transactionId.ts for why the DB layer itself isn't).

type ProgressState = 'under' | 'warning' | 'over';

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
