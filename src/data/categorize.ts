import { Transaction } from '../statement/types';
import { AmountCondition, Rule } from './RulesContext';

export const UNCATEGORIZED = 'Uncategorized';

function transactionAmount(tx: Transaction): number {
  return Math.abs(tx.withdrawal ?? tx.deposit ?? 0);
}

// "Merchant regex/contains matching" (CLAUDE.md) as one code path: a plain
// word is also a valid case-insensitive regex that matches itself, so there's
// no separate UI toggle needed between "contains" and "regex" — power users
// get regex for free, everyone else just types a merchant name.
function matchesMerchant(matcher: string, merchant: string): boolean {
  try {
    return new RegExp(matcher, 'i').test(merchant);
  } catch {
    return merchant.toLowerCase().includes(matcher.toLowerCase());
  }
}

function matchesAmount(cond: AmountCondition, amount: number): boolean {
  switch (cond.operator) {
    case 'moreThan':
      return amount > cond.value;
    case 'lessThan':
      return amount < cond.value;
    case 'equalTo':
      return amount === cond.value;
    case 'between':
      return amount >= cond.min && amount <= cond.max;
  }
}

function matchesRule(rule: Rule, tx: Transaction): boolean {
  if (!rule.merchant && !rule.amount) return false;
  if (rule.merchant && !matchesMerchant(rule.merchant, tx.merchant)) return false;
  if (rule.amount && !matchesAmount(rule.amount, transactionAmount(tx))) return false;
  return true;
}

// First-match-wins, per CLAUDE.md, falling back to Uncategorized.
export function categorizeTransaction(rules: Rule[], tx: Transaction): string {
  const match = rules.find((rule) => matchesRule(rule, tx));
  return match?.category ?? UNCATEGORIZED;
}
