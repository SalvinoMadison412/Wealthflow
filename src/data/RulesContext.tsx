import React, { createContext, useContext, useMemo, useState } from 'react';

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

// Ships empty, per CLAUDE.md: categorization rules are entirely user-built,
// starting from onboarding. Nothing here is pre-seeded from the internal
// merchant display-name lookup table (src/statement/merchantNames.ts) either
// — that table only cleans up names, it never assigns a category.
const initialRules: Rule[] = [];

interface RulesContextValue {
  rules: Rule[];
  addRule: (rule: Omit<Rule, 'id'>) => void;
  removeRule: (id: string) => void;
}

const RulesContext = createContext<RulesContextValue | null>(null);

export function RulesProvider({ children }: { children: React.ReactNode }) {
  const [rules, setRules] = useState<Rule[]>(initialRules);

  const value = useMemo<RulesContextValue>(
    () => ({
      rules,
      addRule: (rule) => setRules((prev) => [...prev, { ...rule, id: String(Date.now()) }]),
      removeRule: (id) => setRules((prev) => prev.filter((r) => r.id !== id)),
    }),
    [rules]
  );

  return <RulesContext.Provider value={value}>{children}</RulesContext.Provider>;
}

export function useRules(): RulesContextValue {
  const ctx = useContext(RulesContext);
  if (!ctx) throw new Error('useRules must be used within a RulesProvider');
  return ctx;
}
