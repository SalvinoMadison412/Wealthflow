// ponytail: fixed threshold; make it a setting only if users ask for one.
export const STALE_AFTER_DAYS = 35;

const DAY_MS = 86_400_000;

// "Has the user imported a statement recently?" — keyed off the newest
// statement's period end, not the import date: an old statement imported
// today is still old data.
export function isStatementStale(latestPeriodEnd: string | null, now: Date): boolean {
  if (!latestPeriodEnd) return true;
  const end = new Date(latestPeriodEnd);
  if (Number.isNaN(end.getTime())) return true;
  return (now.getTime() - end.getTime()) / DAY_MS > STALE_AFTER_DAYS;
}
