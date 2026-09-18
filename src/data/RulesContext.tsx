import React, { createContext, useContext, useMemo } from 'react';

import { db } from '../db/db';
import { deleteRule, insertRule } from '../db/transactions';
import { useQuery } from '../db/useQuery';

export type AmountCondition =
  | { operator: 'moreThan' | 'lessThan' | 'equalTo'; value: number }
  | { operator: 'between'; min: number; max: number };

export interface Rule {
  id: string;
  // A rule needs at least one of these set; when both are set, both must
  // match (AND) — see categorizeTransaction in ./categorize.
  merchant?: string;
  amount?: AmountCondition;
  category: string;
}

type RuleRow = {
  id: string;
  merchant_pattern: string | null;
  amount_json: string | null;
  category: string;
};

function toRule(row: RuleRow): Rule {
  return {
    id: row.id,
    merchant: row.merchant_pattern ?? undefined,
    amount: row.amount_json ? JSON.parse(row.amount_json) : undefined,
    category: row.category,
  };
}

interface RulesContextValue {
  rules: Rule[];
  addRule: (rule: Omit<Rule, 'id'>) => void;
  removeRule: (id: string) => void;
}

const RulesContext = createContext<RulesContextValue | null>(null);

// Persisted in SQLite (see src/db) — rules ship empty per CLAUDE.md
// (entirely user-built, nothing pre-seeded) and survive app restarts.
export function RulesProvider({ children }: { children: React.ReactNode }) {
  const rows = useQuery(
    () =>
      db.getAllSync<RuleRow>(
        `SELECT r.id, r.merchant_pattern, r.amount_json, c.name as category
         FROM rules r JOIN categories c ON c.id = r.category_id
         ORDER BY r.position ASC`
      ),
    []
  );

  const value = useMemo<RulesContextValue>(
    () => ({
      rules: rows.map(toRule),
      addRule: (rule) => insertRule(rule),
      removeRule: (id) => deleteRule(id),
    }),
    [rows]
  );

  return <RulesContext.Provider value={value}>{children}</RulesContext.Provider>;
}

export function useRules(): RulesContextValue {
  const ctx = useContext(RulesContext);
  if (!ctx) throw new Error('useRules must be used within a RulesProvider');
  return ctx;
}
