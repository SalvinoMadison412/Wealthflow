// Pure, deterministic compound-interest math — no model, ever (CLAUDE.md).
// "Smart Calculator" is an estimator, never framed as AI or a prediction.

// Future value of a fixed monthly contribution, compounding monthly at
// `annualRatePct` over `years` (ordinary annuity: contribution made at
// the end of each month).
export function futureValue(monthlyContribution: number, annualRatePct: number, years: number): number {
  const months = Math.round(years * 12);
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate === 0) return monthlyContribution * months;
  return monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

// Months of the same fixed monthly contribution needed to reach
// `goalAmount`. Returns null when it's mathematically unreachable (no
// contribution, or a negative rate that shrinks the balance forever).
export function monthsToGoal(goalAmount: number, monthlyContribution: number, annualRatePct: number): number | null {
  if (monthlyContribution <= 0 || goalAmount <= 0) return null;
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate === 0) return Math.ceil(goalAmount / monthlyContribution);

  const inner = 1 + (goalAmount * monthlyRate) / monthlyContribution;
  if (inner <= 0) return null;
  return Math.ceil(Math.log(inner) / Math.log(1 + monthlyRate));
}
