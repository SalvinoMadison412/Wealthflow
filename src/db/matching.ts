// Pure recategorization logic — no expo-sqlite import, so it can be unit
// tested directly (see transactionId.ts for why the DB layer itself can't
// be). recategorize.ts wraps these with the actual SQL reads/writes.

export type AmountCondition =
  | { operator: 'moreThan' | 'lessThan' | 'equalTo'; value: number }
  | { operator: 'between'; min: number; max: number };

export type DbRuleRow = {
  id: string;
  merchant_pattern: string | null;
  amount_json: string | null;
  category_id: string;
};

type CompiledRule = {
  id: string;
  categoryId: string;
  matches: (merchant: string, amount: number) => boolean;
};

// A plain word is also a valid case-insensitive regex that matches
// itself, so "contains" and "regex" are one code path — power users get
// regex for free. An invalid pattern (e.g. an unescaped merchant name
// like "AMAZON.IN") falls back to a literal contains rather than
// rejecting the rule outright.
function compileMerchantMatcher(pattern: string): (merchant: string) => boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return (merchant) => regex.test(merchant);
  } catch {
    const needle = pattern.toLowerCase();
    return (merchant) => merchant.toLowerCase().includes(needle);
  }
}

function matchesAmount(condition: AmountCondition, amount: number): boolean {
  switch (condition.operator) {
    case 'moreThan':
      return amount > condition.value;
    case 'lessThan':
      return amount < condition.value;
    case 'equalTo':
      return amount === condition.value;
    case 'between':
      return amount >= condition.min && amount <= condition.max;
  }
}

// Compiles each rule's regex/amount condition once, up front — the fix for
// the old render-path bug where a merchant regex was rebuilt from scratch
// per transaction per rule.
export function compileRules(rows: DbRuleRow[]): CompiledRule[] {
  return rows.map((row) => {
    const merchantMatches = row.merchant_pattern ? compileMerchantMatcher(row.merchant_pattern) : null;
    const amountCondition: AmountCondition | null = row.amount_json ? JSON.parse(row.amount_json) : null;

    return {
      id: row.id,
      categoryId: row.category_id,
      matches: (merchant, amount) => {
        if (!merchantMatches && !amountCondition) return false;
        if (merchantMatches && !merchantMatches(merchant)) return false;
        if (amountCondition && !matchesAmount(amountCondition, amount)) return false;
        return true;
      },
    };
  });
}

// First-match-wins: `rules` must already be ordered by priority (position
// ASC) and pre-filtered to enabled rules — both are the caller's job via
// the SQL query, not this function's.
export function findMatch(rules: CompiledRule[], merchant: string, amount: number): CompiledRule | undefined {
  return rules.find((rule) => rule.matches(merchant, amount));
}
