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

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Last month of the Home chart's `span`-month window. The window starts at
// the oldest month with data (within `span` of the newest) so a lone March
// statement sits on the left with the following months to its right,
// instead of being pushed to the right edge behind empty months. Never
// runs past the current month (or the newest data, if that is later).
// `monthsWithData` is newest first (listMonthsWithData).
export function chartEndMonth(monthsWithData: string[], span: number, currentMonth: string): string {
  if (monthsWithData.length === 0) return currentMonth;
  const newest = monthsWithData[0];
  const cutoff = shiftMonth(newest, -span);
  const inWindow = monthsWithData.filter((m) => m > cutoff);
  const end = shiftMonth(inWindow[inWindow.length - 1], span - 1);
  const cap = newest > currentMonth ? newest : currentMonth;
  return end < cap ? end : cap;
}

// The Budget donut: the `top` biggest items keep their own slice, the rest
// merge into one "Others" slice. `items` must be sorted biggest first.
export function topWithOthers<T extends { spent: number }>(items: T[], top: number): { top: T[]; othersSpent: number } {
  return {
    top: items.slice(0, top),
    othersSpent: items.slice(top).reduce((sum, i) => sum + i.spent, 0),
  };
}
