import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { importStatement } from '../db/transactions';
import { PageContent } from '../pdf/types';
import { ParsedStatement, ReconciliationResult } from '../statement/types';

interface TransactionsContextValue {
  statement: ParsedStatement | null;
  reconciliation: ReconciliationResult | null;
  loadFromPages: (pages: PageContent[]) => ParsedStatement;
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

// `statement`/`reconciliation` here are this session's last-import result,
// for the current Home screen's immediate post-import confirmation UI —
// not a durable read model (that's screens querying src/db directly,
// starting with the Home rewrite in PR 7). The underlying data itself is
// fully persisted in SQLite via importStatement and does survive a
// restart; nothing in the app queries it back yet.
export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [statement, setStatement] = useState<ParsedStatement | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);

  const loadFromPages = useCallback((pages: PageContent[]) => {
    const result = importStatement(pages);
    setStatement(result.statement);
    setReconciliation(result.reconciliation);
    return result.statement;
  }, []);

  const value = useMemo<TransactionsContextValue>(
    () => ({ statement, reconciliation, loadFromPages }),
    [statement, reconciliation, loadFromPages]
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within a TransactionsProvider');
  return ctx;
}
