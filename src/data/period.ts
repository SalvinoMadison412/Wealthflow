// 'YYYY' or 'YYYY-MM' as a half-open range on ISO date strings. A range on
// the bare column can use idx_transactions_date; strftime(date) cannot.
// '~' sorts after every digit and '-', so '2025-03~' is past all of March.
export function periodRange(period: string): [string, string] {
  return [period, `${period}~`];
}
