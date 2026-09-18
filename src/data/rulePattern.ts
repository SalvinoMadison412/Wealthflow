// Pure — no expo-sqlite import, so it's unit tested directly (see
// db/transactionId.ts for why the DB layer itself isn't).

type AmountCondition =
  | { operator: 'moreThan' | 'lessThan' | 'equalTo'; value: number }
  | { operator: 'between'; min: number; max: number };

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A tapped transaction's merchant is often the raw statement descriptor
// ("SWIGGY*ORDER-8812", "AMAZON.IN"), not a clean name. This turns it into
// a sane default rule matcher: drop everything from a "*" separator
// onward (payment processors use it to prefix an order/ref id), drop
// trailing all-digit/#/- reference tokens, keep at most the first two
// remaining words, then escape it so it's always a safe literal regex —
// never throws when compiled, whatever the input.
export function suggestPattern(merchant: string): string {
  const upper = merchant.trim().toUpperCase();
  const beforeStar = upper.split('*')[0].trim();
  const tokens = beforeStar.split(/\s+/).filter(Boolean);

  while (tokens.length > 0 && /^[\d\-#*]+$/.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  const kept = tokens.slice(0, 2).join(' ') || beforeStar || upper;
  return escapeRegex(kept);
}

function describeAmount(condition: AmountCondition): string {
  switch (condition.operator) {
    case 'moreThan':
      return `Amount is more than ₹${condition.value}`;
    case 'lessThan':
      return `Amount is less than ₹${condition.value}`;
    case 'equalTo':
      return `Amount is ₹${condition.value}`;
    case 'between':
      return `Amount is between ₹${condition.min} and ₹${condition.max}`;
  }
}

// Plain-language summary of a rule — used by the categorize sheet's
// "Matched by rule: …" line and the Rules screen's cards (PR 8).
export function describeRule(rule: { merchant?: string | null; amount?: AmountCondition | null; category: string }): string {
  const parts: string[] = [];
  if (rule.merchant) parts.push(`Description contains "${rule.merchant}"`);
  if (rule.amount) parts.push(describeAmount(rule.amount));
  const condition = parts.length > 0 ? parts.join(' and ') : 'Always';
  return `${condition} → ${rule.category}`;
}
