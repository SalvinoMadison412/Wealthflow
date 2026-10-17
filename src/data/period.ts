// 'YYYY' or 'YYYY-MM' as a half-open range on ISO date strings. A range on
// the bare column can use idx_transactions_date; strftime(date) cannot.
// '~' sorts after every digit and '-', so '2025-03~' is past all of March.
export function periodRange(period: string): [string, string] {
  return [period, `${period}~`];
}

// What the shared period filter (Home + Transactions) points at.
// choice: undefined = newest month with data; 'YYYY-MM' = a month; 'YYYY' =
// that whole year. months: every month with data, newest first. A chosen
// month the account filter now hides falls back to the newest.
export function resolvePeriod(choice: string | undefined, months: string[]) {
  const isYear = choice?.length === 4;
  const month = isYear ? null : choice && months.includes(choice) ? choice : (months[0] ?? null);
  const period = isYear ? choice! : month;
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  // Older / newer neighbours: months in month view, years in year view.
  const list = isYear ? years : months;
  const i = period ? list.indexOf(period) : -1;
  return {
    month,
    period,
    year: period?.slice(0, 4) ?? null,
    years,
    older: i >= 0 ? list[i + 1] : undefined,
    newer: i > 0 ? list[i - 1] : undefined,
  };
}

// The newest month with data in `year` (where picking a year lands).
export function newestMonthIn(year: string, months: string[]): string | undefined {
  return months.find((m) => m.startsWith(year));
}
