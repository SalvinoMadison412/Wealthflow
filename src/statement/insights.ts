import { categorizeTransaction, UNCATEGORIZED } from '../data/categorize';
import { Rule } from '../data/RulesContext';
import { Transaction } from './types';

export type Breakdown = { label: string; value: number }[];

function spendOnly(txs: Transaction[]): Transaction[] {
  return txs.filter((t) => t.withdrawal != null);
}

function groupSum(txs: Transaction[], keyOf: (t: Transaction) => string): Breakdown {
  const totals = new Map<string, number>();
  for (const t of txs) {
    const key = keyOf(t);
    totals.set(key, (totals.get(key) ?? 0) + (t.withdrawal ?? 0));
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function spendByCategory(txs: Transaction[], rules: Rule[]): Breakdown {
  return groupSum(spendOnly(txs), (t) => categorizeTransaction(rules, t));
}

export function spendByMerchant(txs: Transaction[]): Breakdown {
  return groupSum(spendOnly(txs), (t) => t.merchant);
}

// Uncategorized until the user has written rules that actually match
// something (CLAUDE.md: ships with zero default rules) — merchant is the
// more useful default breakdown in that state.
export function isEntirelyUncategorized(breakdown: Breakdown): boolean {
  return breakdown.every((b) => b.label === UNCATEGORIZED);
}

// Keeps a pie chart's legend readable when there are many small merchants —
// the long tail collapses into one "Other" slice rather than every rare
// payee getting its own barely-visible sliver.
export function capBreakdown(breakdown: Breakdown, max: number): Breakdown {
  if (breakdown.length <= max) return breakdown;
  const head = breakdown.slice(0, max - 1);
  const otherTotal = breakdown.slice(max - 1).reduce((sum, b) => sum + b.value, 0);
  return [...head, { label: 'Other', value: otherTotal }];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function spendByDayOfWeek(txs: Transaction[]): Breakdown {
  const totals = new Array(7).fill(0);
  for (const t of spendOnly(txs)) {
    const jsDay = new Date(t.date).getDay(); // 0 = Sun
    const mondayFirst = (jsDay + 6) % 7;
    totals[mondayFirst] += t.withdrawal ?? 0;
  }
  return DAY_LABELS.map((label, i) => ({ label, value: totals[i] }));
}

function isWeekend(date: string): boolean {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
}

// ponytail: naive month-end window (last 7 days of the calendar month);
// revisit if a billing-cycle-aware definition is ever needed.
function isMonthEnd(date: string): boolean {
  const d = new Date(date);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return daysInMonth - d.getDate() < 7;
}

export type PeriodComparison = { aLabel: string; aAvg: number; bLabel: string; bAvg: number };

function compareByPredicate(
  txs: Transaction[],
  predicate: (date: string) => boolean,
  aLabel: string,
  bLabel: string
): PeriodComparison {
  const dates = new Set(txs.map((t) => t.date));
  let aDays = 0;
  let bDays = 0;
  for (const date of dates) (predicate(date) ? aDays++ : bDays++);

  let aTotal = 0;
  let bTotal = 0;
  for (const t of spendOnly(txs)) {
    if (predicate(t.date)) aTotal += t.withdrawal ?? 0;
    else bTotal += t.withdrawal ?? 0;
  }

  return {
    aLabel,
    aAvg: aDays > 0 ? aTotal / aDays : 0,
    bLabel,
    bAvg: bDays > 0 ? bTotal / bDays : 0,
  };
}

export function weekendVsWeekday(txs: Transaction[]): PeriodComparison {
  return compareByPredicate(txs, isWeekend, 'Weekend', 'Weekday');
}

export function monthEndVsMidMonth(txs: Transaction[]): PeriodComparison {
  return compareByPredicate(txs, isMonthEnd, 'Month-end', 'Mid-month');
}
