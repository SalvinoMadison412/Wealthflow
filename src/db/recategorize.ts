import { findPreset } from '../data/autoCategorize';
import { getOrCreateCategoryByName } from './categories';
import { db } from './db';
import { compileRules, DbRuleRow, findMatch, matchText } from './matching';
import { UNCATEGORIZED_CATEGORY_ID } from './schema';

export const AUTO_CATEGORISE_SETTING = 'auto_categorise';
// matched_rule_id marker for a transaction sorted by a built-in pattern.
export const AUTO_MATCH_ID = 'auto';

type TransactionRow = {
  id: string;
  merchant: string;
  description: string;
  withdrawal: number | null;
  deposit: number | null;
  category_override_id: string | null;
};

type RecategorizeScope = 'all' | { statementId: string };

// Recomputes category_id + matched_rule_id for every affected transaction.
// Call after any rule or category write. Precedence: a manual override
// always wins; otherwise the first enabled rule (by priority) matches;
// otherwise a built-in pattern if Auto-categorise is on; otherwise
// Uncategorized. Not unit tested directly — expo-sqlite has no
// Jest binding (see matching.ts, which carries the tested logic this
// function is a thin SQL wrapper around); verified on-device.
export function recategorize(scope: RecategorizeScope = 'all'): void {
  const ruleRows = db.getAllSync<DbRuleRow>(
    'SELECT id, merchant_pattern, amount_json, category_id FROM rules WHERE enabled = 1 ORDER BY position ASC'
  );
  const compiled = compileRules(ruleRows);
  const autoOn =
    db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [AUTO_CATEGORISE_SETTING])?.value ===
    '1';
  // Built-in categories are created only once something actually lands in them.
  const presetCategoryIds = new Map<string, string>();

  const transactions =
    scope === 'all'
      ? db.getAllSync<TransactionRow>(
          'SELECT id, merchant, description, withdrawal, deposit, category_override_id FROM transactions'
        )
      : db.getAllSync<TransactionRow>(
          'SELECT id, merchant, description, withdrawal, deposit, category_override_id FROM transactions WHERE statement_id = ?',
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
      const text = matchText(tx.merchant, tx.description);
      const match = findMatch(compiled, text, amount);
      let categoryId = match?.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
      let matchedId = match?.id ?? null;
      const preset = !match && autoOn ? findPreset(text) : undefined;
      if (preset) {
        let id = presetCategoryIds.get(preset.category);
        if (!id) {
          id = getOrCreateCategoryByName(preset.category);
          presetCategoryIds.set(preset.category, id);
        }
        categoryId = id;
        matchedId = AUTO_MATCH_ID;
      }
      db.runSync('UPDATE transactions SET category_id = ?, matched_rule_id = ? WHERE id = ?', [
        categoryId,
        matchedId,
        tx.id,
      ]);
    }
  });
}
