import { PageContent } from '../pdf/types';
import { parseStatement } from '../statement/registry';
import { reconcile } from '../statement/reconciliation';
import { ParsedStatement, ReconciliationResult } from '../statement/types';
import { detectTransferPairs, TransferCandidate } from '../data/transfers';
import { db } from './db';
import { AmountCondition, compileRules } from './matching';
import { recategorize } from './recategorize';
import { TRANSFER_CATEGORY_ID, UNCATEGORIZED_CATEGORY_ID } from './schema';
import { makeTransactionId, newId } from './transactionId';

export type Account = {
  id: string;
  bank: string;
  maskedNumber: string | null;
  ownerLabel: string;
  lastImportedPeriodEnd: string | null;
  lastImportedAt: string | null;
};

type AccountRow = {
  id: string;
  bank: string;
  masked_number: string | null;
  owner_label: string;
  last_period_end: string | null;
  last_imported_at: string | null;
};

// Ordered by creation, oldest first — stable enough for a handful of
// accounts without a user-facing reorder feature.
export function listAccounts(): Account[] {
  const rows = db.getAllSync<AccountRow>(
    `SELECT a.id, a.bank, a.masked_number, a.owner_label,
       (SELECT s.period_end FROM statements s WHERE s.account_id = a.id ORDER BY s.imported_at DESC LIMIT 1) as last_period_end,
       (SELECT s.imported_at FROM statements s WHERE s.account_id = a.id ORDER BY s.imported_at DESC LIMIT 1) as last_imported_at
     FROM accounts a
     ORDER BY a.created_at ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    bank: r.bank,
    maskedNumber: r.masked_number,
    ownerLabel: r.owner_label,
    lastImportedPeriodEnd: r.last_period_end,
    lastImportedAt: r.last_imported_at,
  }));
}

// `maskedNumber` is never extracted from the statement (see
// statement/types.ts) — it's whatever nickname the user types in the
// account chooser, or null if they skip it.
export function createAccount(input: { bank: string; maskedNumber: string | null; ownerLabel: string }): string {
  const id = newId();
  db.runSync('INSERT INTO accounts (id, bank, masked_number, owner_label, created_at) VALUES (?, ?, ?, ?, ?)', [
    id,
    input.bank.trim(),
    input.maskedNumber?.trim() || null,
    input.ownerLabel.trim() || 'Me',
    new Date().toISOString(),
  ]);
  return id;
}

// Account cards are tappable to rename the bank label or owner only — no
// deletion in this PR (that's Profile, PR 10).
export function renameAccount(id: string, input: { bank?: string; ownerLabel?: string }): void {
  if (input.bank !== undefined) {
    db.runSync('UPDATE accounts SET bank = ? WHERE id = ?', [input.bank.trim(), id]);
  }
  if (input.ownerLabel !== undefined) {
    db.runSync('UPDATE accounts SET owner_label = ? WHERE id = ?', [input.ownerLabel.trim() || 'Me', id]);
  }
}

// Parses + reconciles (as before) and now also persists: creates the
// statement and its transactions (idempotent — re-importing the same PDF
// is a no-op, see transactionId.ts), then recategorizes the new rows.
// Returns the parsed statement/reconciliation for the caller's immediate
// post-import UI, same as before this PR.
export function importStatement(
  pages: PageContent[],
  accountId: string
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
  runTransferDetection();

  return { statement, reconciliation };
}

// Scans every not-yet-marked transaction (across all accounts — a
// transfer can only be recognized once both legs exist) and marks any
// detected pair transfer. Runs after every import; category_id
// deliberately overrides whatever recategorize() just set, since a
// transfer should never carry a user category. See data/transfers.ts for
// the matching rule.
function runTransferDetection(): void {
  const rows = db.getAllSync<{
    id: string;
    account_id: string;
    date: string;
    withdrawal: number | null;
    deposit: number | null;
  }>('SELECT id, account_id, date, withdrawal, deposit FROM transactions WHERE is_transfer = 0');

  const candidates: TransferCandidate[] = rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    date: r.date,
    withdrawal: r.withdrawal,
    deposit: r.deposit,
  }));

  const pairs = detectTransferPairs(candidates);
  if (pairs.length === 0) return;

  db.withTransactionSync(() => {
    for (const [withdrawalId, depositId] of pairs) {
      db.runSync('UPDATE transactions SET is_transfer = 1, category_id = ?, matched_rule_id = NULL WHERE id IN (?, ?)', [
        TRANSFER_CATEGORY_ID,
        withdrawalId,
        depositId,
      ]);
    }
  });
}

export function getOrCreateCategoryByName(name: string): string {
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
  requestIdleCallback(() => recategorize('all'));
}

// The write (one row) is instant; the expensive part — re-running every
// transaction through the compiled rule set — is deferred past the
// current interaction so the Switch's own flip animation stays smooth.
export function setRuleEnabled(id: string, enabled: boolean): void {
  db.runSync('UPDATE rules SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
  requestIdleCallback(() => recategorize('all'));
}

// Swaps this rule's position with its immediate neighbor — no
// drag-and-drop (see docs/REDESIGN_PLAN.md PR 8), just move up/down.
// A no-op at either end of the list.
export function moveRule(id: string, direction: 'up' | 'down'): void {
  const rules = db.getAllSync<{ id: string; position: number }>('SELECT id, position FROM rules ORDER BY position ASC');
  const index = rules.findIndex((r) => r.id === id);
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= rules.length) return;

  const current = rules[index];
  const neighbor = rules[swapIndex];
  db.withTransactionSync(() => {
    db.runSync('UPDATE rules SET position = ? WHERE id = ?', [neighbor.position, current.id]);
    db.runSync('UPDATE rules SET position = ? WHERE id = ?', [current.position, neighbor.id]);
  });
  requestIdleCallback(() => recategorize('all'));
}

// "Just this one" — an override always wins over every rule (see
// recategorize.ts), so setting category_id here directly is equivalent to
// (and cheaper than) writing the override and re-running the full
// recategorize pass for a single row.
export function setCategoryOverride(transactionId: string, categoryId: string): void {
  db.runSync('UPDATE transactions SET category_override_id = ?, category_id = ?, matched_rule_id = NULL WHERE id = ?', [
    categoryId,
    categoryId,
    transactionId,
  ]);
}

export function clearCategoryOverride(transactionId: string): void {
  db.runSync('UPDATE transactions SET category_override_id = NULL WHERE id = ?', [transactionId]);
}

// How many other transactions a not-yet-saved rule would also catch —
// the categorize sheet's "Also recategorizes N past transactions" line.
// No REGEXP support in expo-sqlite's SQLite build, so this reuses the
// same compiled-matcher logic recategorize() runs, just over a read-only
// preview instead of a write.
export function retroCount(merchantPattern: string | null, amount: AmountCondition | null): number {
  if (!merchantPattern && !amount) return 0;
  const rows = db.getAllSync<{ merchant: string; withdrawal: number | null; deposit: number | null }>(
    'SELECT merchant, withdrawal, deposit FROM transactions WHERE category_override_id IS NULL'
  );
  const [compiled] = compileRules([
    { id: 'preview', merchant_pattern: merchantPattern, amount_json: amount ? JSON.stringify(amount) : null, category_id: 'preview' },
  ]);
  return rows.filter((r) => compiled.matches(r.merchant, Math.abs(r.withdrawal ?? r.deposit ?? 0))).length;
}

export function deleteSetting(key: string): void {
  db.runSync('DELETE FROM settings WHERE key = ?', [key]);
}

export function setSetting(key: string, value: string): void {
  db.runSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

// Bucket default for a newly created category is 'wants' (set at
// creation in getOrCreateCategoryByName); this is only for re-assigning
// an existing one from the Budget screen's tap-to-cycle chip.
export function setCategoryBucket(categoryId: string, bucket: 'needs' | 'wants' | 'savings'): void {
  db.runSync('UPDATE categories SET bucket = ? WHERE id = ?', [bucket, categoryId]);
}

export function setCategoryBudget(categoryId: string, monthlyBudget: number | null): void {
  db.runSync('UPDATE categories SET monthly_budget = ? WHERE id = ?', [monthlyBudget, categoryId]);
}

export function renameCategory(id: string, name: string): void {
  db.runSync('UPDATE categories SET name = ? WHERE id = ?', [name.trim(), id]);
}

export function setCategoryColor(id: string, colorIndex: number): void {
  db.runSync('UPDATE categories SET color_index = ? WHERE id = ?', [((colorIndex % 10) + 10) % 10, id]);
}

// Every transaction currently in this category (or overridden to it)
// reassigns to Uncategorized, any rule targeting it is removed (its
// category_id no longer exists), then the row itself is deleted — in
// that order, so no foreign key is left dangling. Reserved categories
// (Uncategorized, Transfer) can't be deleted.
export function deleteCategory(id: string): void {
  if (id === UNCATEGORIZED_CATEGORY_ID || id === TRANSFER_CATEGORY_ID) return;
  db.withTransactionSync(() => {
    db.runSync('UPDATE transactions SET category_id = ? WHERE category_id = ?', [UNCATEGORIZED_CATEGORY_ID, id]);
    db.runSync('UPDATE transactions SET category_override_id = NULL WHERE category_override_id = ?', [id]);
    db.runSync('DELETE FROM rules WHERE category_id = ?', [id]);
    db.runSync('DELETE FROM categories WHERE id = ?', [id]);
  });
  requestIdleCallback(() => recategorize('all'));
}

// Cascades manually (foreign_keys = ON, no ON DELETE CASCADE in the
// schema) — an account's statements and transactions have no meaning
// without it, so they go too, unlike a category's transactions which
// fall back to Uncategorized instead.
export function deleteAccount(id: string): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM transactions WHERE account_id = ?', [id]);
    db.runSync('DELETE FROM statements WHERE account_id = ?', [id]);
    db.runSync('DELETE FROM accounts WHERE id = ?', [id]);
  });
}

// Resets to a fresh install: every account/statement/transaction/rule,
// every user-created category, and every setting. The two reserved
// categories are kept (schema.ts seeds them at migration, not here).
export function wipeAllData(): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM transactions');
    db.runSync('DELETE FROM statements');
    db.runSync('DELETE FROM accounts');
    db.runSync('DELETE FROM rules');
    db.runSync('DELETE FROM categories WHERE id NOT IN (?, ?)', [UNCATEGORIZED_CATEGORY_ID, TRANSFER_CATEGORY_ID]);
    db.runSync('DELETE FROM settings');
  });
}
