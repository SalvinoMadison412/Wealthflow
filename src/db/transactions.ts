import { PageContent } from '../pdf/types';
import { parseStatement } from '../statement/registry';
import { reconcile } from '../statement/reconciliation';
import { ParsedStatement, ReconciliationResult } from '../statement/types';
import { db } from './db';
import { recategorize } from './recategorize';
import { UNCATEGORIZED_CATEGORY_ID } from './schema';
import { makeTransactionId, newId } from './transactionId';

// PR 4 (Import Statement screen) gives accounts real bank/masked-number
// identity from the parsed statement. Until then, every import lands on
// this single placeholder account so the existing single-account Home
// screen keeps working unmodified.
const DEFAULT_ACCOUNT_ID = 'default';

function ensureDefaultAccount(): string {
  db.runSync(
    'INSERT OR IGNORE INTO accounts (id, bank, masked_number, owner_label, created_at) VALUES (?, ?, ?, ?, ?)',
    [DEFAULT_ACCOUNT_ID, 'Statement', null, 'Me', new Date().toISOString()]
  );
  return DEFAULT_ACCOUNT_ID;
}

// Parses + reconciles (as before) and now also persists: creates the
// statement and its transactions (idempotent — re-importing the same PDF
// is a no-op, see transactionId.ts), then recategorizes the new rows.
// Returns the parsed statement/reconciliation for the caller's immediate
// post-import UI, same as before this PR.
export function importStatement(
  pages: PageContent[],
  accountId: string = ensureDefaultAccount()
): { statement: ParsedStatement; reconciliation: ReconciliationResult } {
  const statement = parseStatement(pages);
  const reconciliation = reconcile(statement);

  const statementId = newId();
  const periodStart = statement.transactions[0]?.date ?? null;
  const periodEnd = statement.transactions[statement.transactions.length - 1]?.date ?? null;

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO statements (id, account_id, period_start, period_end, opening, closing, reconciled_ok, imported_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        statementId,
        accountId,
        periodStart,
        periodEnd,
        statement.openingBalance,
        statement.closingBalance,
        reconciliation.ok ? 1 : 0,
        new Date().toISOString(),
      ]
    );

    for (const tx of statement.transactions) {
      const id = makeTransactionId({
        accountId,
        date: tx.date,
        withdrawal: tx.withdrawal,
        deposit: tx.deposit,
        balance: tx.balance,
        refNo: tx.refNo,
        description: tx.description,
      });
      db.runSync(
        `INSERT OR IGNORE INTO transactions
           (id, statement_id, account_id, date, description, merchant, ref_no, withdrawal, deposit, balance, category_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          statementId,
          accountId,
          tx.date,
          tx.description,
          tx.merchant,
          tx.refNo,
          tx.withdrawal,
          tx.deposit,
          tx.balance,
          UNCATEGORIZED_CATEGORY_ID,
        ]
      );
    }
  });

  recategorize({ statementId });

  return { statement, reconciliation };
}

function getOrCreateCategoryByName(name: string): string {
  const existing = db.getFirstSync<{ id: string }>('SELECT id FROM categories WHERE name = ?', [name]);
  if (existing) return existing.id;

  const { max } = db.getFirstSync<{ max: number | null }>('SELECT MAX(position) as max FROM categories') ?? {
    max: null,
  };
  const position = (max ?? 0) + 1;
  const id = newId();
  db.runSync(
    'INSERT INTO categories (id, name, color_index, bucket, monthly_budget, position) VALUES (?, ?, ?, ?, NULL, ?)',
    [id, name, position % 10, 'wants', position]
  );
  return id;
}

export type AmountCondition =
  | { operator: 'moreThan' | 'lessThan' | 'equalTo'; value: number }
  | { operator: 'between'; min: number; max: number };

// Matches RulesContext's existing public shape (category by name, not id)
// so the not-yet-rewritten Rules screens (PR 8) keep working unmodified.
export function insertRule(rule: { merchant?: string; amount?: AmountCondition; category: string }): void {
  const categoryId = getOrCreateCategoryByName(rule.category);
  const { min } = db.getFirstSync<{ min: number | null }>('SELECT MIN(position) as min FROM rules') ?? {
    min: null,
  };
  // New rules take top priority — a rule the user just created for a
  // transaction should win over anything that matched it before.
  const position = (min ?? 0) - 1;

  db.runSync(
    `INSERT INTO rules (id, merchant_pattern, amount_json, category_id, enabled, position, created_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
    [
      newId(),
      rule.merchant ?? null,
      rule.amount ? JSON.stringify(rule.amount) : null,
      categoryId,
      position,
      new Date().toISOString(),
    ]
  );

  recategorize('all');
}

export function deleteRule(id: string): void {
  db.runSync('DELETE FROM rules WHERE id = ?', [id]);
  recategorize('all');
}
