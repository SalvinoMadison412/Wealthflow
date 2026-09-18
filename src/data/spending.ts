// Pure — no expo-sqlite import, unit tested directly.

// ponytail: tuning knobs. At or under PALE the month is healthy; at or
// over FLAG it is a red flag (spent about everything that came in).
const PALE = 0.5;
const FLAG = 0.9;
const MIN_OPACITY = 0.35;

export type ExpenseTone = { ratio: number | null; opacity: number; flag: boolean };

// How loud the red expense bar should be for a month: pale when spending
// is well under income, full red and flagged when it is about equal (or
// there was spending with no income at all). ratio is null when there is
// no income to compare against.
export function expenseTone(income: number, expense: number): ExpenseTone {
  if (income <= 0) return { ratio: null, opacity: 1, flag: expense > 0 };
  const ratio = expense / income;
  if (ratio >= FLAG) return { ratio, opacity: 1, flag: true };
  if (ratio <= PALE) return { ratio, opacity: MIN_OPACITY, flag: false };
  const t = (ratio - PALE) / (FLAG - PALE);
  return { ratio, opacity: MIN_OPACITY + t * (1 - MIN_OPACITY), flag: false };
}
