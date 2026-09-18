import { db } from './db';
import { compileRules, DbRuleRow, findMatch } from './matching';
import { UNCATEGORIZED_CATEGORY_ID } from './schema';

type TransactionRow = {
  id: string;
  merchant: string;
  withdrawal: number | null;
  deposit: number | null;
  category_override_id: string | null;
};

export type RecategorizeScope = 'all' | { statementId: string };

// Recomputes category_id + matched_rule_id for every affected transaction.
// Call after any rule or category write. Precedence: a manual override
// always wins; otherwise the first enabled rule (by priority) matches;
// otherwise Uncategorized. Not unit tested directly — expo-sqlite has no
// Jest binding (see matching.ts, which carries the tested logic this
// function is a thin SQL wrapper around); verified on-device.
export function recategorize(scope: RecategorizeScope = 'all'): void {
  const ruleRows = db.getAllSync<DbRuleRow>(
    'SELECT id, merchant_pattern, amount_json, category_id FROM rules WHERE enabled = 1 ORDER BY position ASC'
  );
  const compiled = compileRules(ruleRows);

  const transactions =
    scope === 'all'
      ? db.getAllSync<TransactionRow>(
          'SELECT id, merchant, withdrawal, deposit, category_override_id FROM transactions'
        )
      : db.getAllSync<TransactionRow>(
          'SELECT id, merchant, withdrawal, deposit, category_override_id FROM transactions WHERE statement_id = ?',
          [scope.statementId]
        );

  db.withTransactionSync(() => {
    for (const tx of transactions) {
      if (tx.category_override_id) {
        db.runSync('UPDATE transactions SET category_id = ?, matched_rule_id = NULL WHERE id = ?', [
          tx.category_override_id,
          tx.id,
        ]);
        continue;
      }

      const amount = Math.abs(tx.withdrawal ?? tx.deposit ?? 0);
      const match = findMatch(compiled, tx.merchant, amount);
      db.runSync('UPDATE transactions SET category_id = ?, matched_rule_id = ? WHERE id = ?', [
        match?.categoryId ?? UNCATEGORIZED_CATEGORY_ID,
        match?.id ?? null,
        tx.id,
      ]);
    }
  });
}
