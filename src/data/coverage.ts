// Which days the imported statements cover. Periods come from
// statements.period_start/end (the printed period, or first/last row date).
// All dates are ISO yyyy-mm-dd strings, so they compare as text.

export type StatementPeriod = { accountId: string; start: string; end: string };
export type DayRange = [from: string, to: string];
export type AccountCoverage = { accountId: string; covered: DayRange[]; missing: DayRange[] };

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysIn([from, to]: DayRange): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

// Overlapping or touching periods (15 Oct then 16 Oct) become one range.
function merge(ranges: DayRange[]): DayRange[] {
  const out: DayRange[] = [];
  for (const [from, to] of [...ranges].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const last = out[out.length - 1];
    if (last && from <= addDays(last[1], 1)) {
      if (to > last[1]) last[1] = to;
    } else out.push([from, to]);
  }
  return out;
}

function byAccount(periods: StatementPeriod[]): Map<string, DayRange[]> {
  const map = new Map<string, DayRange[]>();
  for (const p of periods) map.set(p.accountId, [...(map.get(p.accountId) ?? []), [p.start, p.end]]);
  return map;
}

// Coverage of one 'YYYY-MM' month, per account whose statements touch it.
// Only days before `today` can be missing: no statement has today yet, and
// the rest of a running month hasn't happened.
export function monthCoverage(periods: StatementPeriod[], month: string, today: string) {
  const first = `${month}-01`;
  const monthEnd = addDays(`${addDays(`${month}-28`, 4).slice(0, 7)}-01`, -1);
  const yesterday = addDays(today, -1);
  const last = yesterday < monthEnd ? yesterday : monthEnd;
  const accounts: AccountCoverage[] = [];
  for (const [accountId, ranges] of byAccount(periods)) {
    const covered = merge(ranges)
      .filter(([from, to]) => from <= monthEnd && to >= first)
      .map(([from, to]): DayRange => [from < first ? first : from, to > monthEnd ? monthEnd : to]);
    if (covered.length === 0) continue;
    const missing: DayRange[] = [];
    let cursor = first;
    for (const [from, to] of covered) {
      if (from > cursor) missing.push([cursor, addDays(from, -1)]);
      cursor = addDays(to, 1);
    }
    if (cursor <= last) missing.push([cursor, last]);
    accounts.push({ accountId, covered, missing: missing.filter(([from]) => from <= last) });
  }
  return {
    accounts,
    days: daysIn([first, monthEnd]),
    complete: accounts.every((a) => a.missing.length === 0),
  };
}

// Holes between one account's statements (a 1-day step, 15 Oct to 16 Oct, is no hole).
export function gapsBetween(periods: StatementPeriod[]): { accountId: string; from: string; to: string }[] {
  const gaps: { accountId: string; from: string; to: string }[] = [];
  for (const [accountId, ranges] of byAccount(periods)) {
    const merged = merge(ranges);
    for (let i = 1; i < merged.length; i++) {
      gaps.push({ accountId, from: addDays(merged[i - 1][1], 1), to: addDays(merged[i][0], -1) });
    }
  }
  return gaps;
}

// "1–15 Oct", "28 Sept – 3 Oct", "1 Jan 2021 – 17 Oct 2026".
export function rangeLabel([from, to]: DayRange): string {
  const years = from.slice(0, 4) !== to.slice(0, 4);
  const d = (iso: string, withMonth: boolean) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
      day: 'numeric',
      ...(withMonth && { month: 'short' }),
      ...(years && { year: 'numeric' }),
      timeZone: 'UTC',
    });
  return from.slice(0, 7) === to.slice(0, 7)
    ? from === to ? d(from, true) : `${d(from, false)}–${d(to, true)}`
    : `${d(from, true)} – ${d(to, true)}`;
}
