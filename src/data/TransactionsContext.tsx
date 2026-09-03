import React, { createContext, useContext, useMemo, useState } from 'react';

import { PageContent } from '../pdf/types';
import { parseStatement } from '../statement/registry';
import { reconcile } from '../statement/reconciliation';
import { ParsedStatement, ReconciliationResult } from '../statement/types';

interface TransactionsContextValue {
  statement: ParsedStatement | null;
  reconciliation: ReconciliationResult | null;
  loadFromPages: (pages: PageContent[]) => ParsedStatement;
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

// In-memory only — expo-sqlite persistence is CLAUDE.md's next build-order
// step, not this one, so a parsed statement doesn't survive an app restart.
export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [statement, setStatement] = useState<ParsedStatement | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);

  const value = useMemo<TransactionsContextValue>(
    () => ({
      statement,
      reconciliation,
      loadFromPages: (pages) => {
        const parsed = parseStatement(pages);
        setStatement(parsed);
        setReconciliation(reconcile(parsed));
        return parsed;
      },
    }),
    [statement, reconciliation]
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within a TransactionsProvider');
  return ctx;
}
