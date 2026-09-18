import { describeRule } from '../data/rulePattern';
import { db } from './db';
import { UNCATEGORIZED_CATEGORY_ID } from './schema';

export type TransactionFilters = {
  accountId?: string;
  month?: string; // 'YYYY-MM'
  categoryId?: string;
  uncategorizedOnly?: boolean;
};

export type TransactionListItem = {
  id: string;
  date: string;
  merchant: string;
  withdrawal: number | null;
  deposit: number | null;
  isTransfer: boolean;
  categoryName: string;
  colorIndex: number;
};

type TransactionRow = {
  id: string;
  date: string;
  merchant: string;
  withdrawal: number | null;
  deposit: number | null;
  is_transfer: number;
  category_name: string;
  color_index: number;
};

// Every breakdown is a SQL WHERE clause, never a JS .filter() over an
// already-loaded array — the list can be thousands of rows.
export function listTransactions(filters: TransactionFilters): TransactionListItem[] {
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters.accountId) {
    clauses.push('t.account_id = ?');
    params.push(filters.accountId);
  }
  if (filters.month) {
    clauses.push("strftime('%Y-%m', t.date) = ?");
    params.push(filters.month);
  }
  if (filters.uncategorizedOnly) {
    clauses.push('t.category_id = ?');
    params.push(UNCATEGORIZED_CATEGORY_ID);
  } else if (filters.categoryId) {
    clauses.push('t.category_id = ?');
    params.push(filters.categoryId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.getAllSync<TransactionRow>(
    `SELECT t.id, t.date, t.merchant, t.withdrawal, t.deposit, t.is_transfer,
            c.name as category_name, c.color_index
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     ${where}
     ORDER BY t.date DESC, t.id DESC`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    merchant: r.merchant,
    withdrawal: r.withdrawal,
    deposit: r.deposit,
    isTransfer: r.is_transfer === 1,
    categoryName: r.category_name,
    colorIndex: r.color_index,
  }));
}

// Last 12 calendar months that actually have a transaction, newest first —
// the Month filter chip's option list.
export function listMonthsWithData(): string[] {
  const rows = db.getAllSync<{ month: string }>(
    `SELECT DISTINCT strftime('%Y-%m', date) as month FROM transactions ORDER BY month DESC LIMIT 12`
  );
  return rows.map((r) => r.month);
}

export type FilterCategory = { id: string; name: string; colorIndex: number };

// Every category including Uncategorized/Transfer — the Category filter
// chip's option list is deliberately the full set, not just user ones.
export function listCategoriesForFilter(): FilterCategory[] {
  const rows = db.getAllSync<{ id: string; name: string; color_index: number }>(
    'SELECT id, name, color_index FROM categories ORDER BY position ASC'
  );
  return rows.map((r) => ({ id: r.id, name: r.name, colorIndex: r.color_index }));
}

export function hasAnyTransactions(): boolean {
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM transactions');
  return (row?.count ?? 0) > 0;
}

export type TransactionDetail = {
  id: string;
  merchant: string;
  description: string;
  date: string;
  accountBank: string;
  withdrawal: number | null;
  deposit: number | null;
  categoryId: string;
  categoryName: string;
  colorIndex: number;
  isOverridden: boolean;
  matchedRuleDescription: string | null;
};

type TransactionDetailRow = {
  id: string;
  merchant: string;
  description: string;
  date: string;
  account_bank: string;
  withdrawal: number | null;
  deposit: number | null;
  category_id: string;
  category_name: string;
  color_index: number;
  category_override_id: string | null;
  matched_rule_id: string | null;
};

// The categorize sheet's source of truth for one transaction, including
// whether its current category came from an override, a matched rule (in
// plain language), or neither ("no rule matched" — still Uncategorized).
export function getTransactionDetail(id: string): TransactionDetail | null {
  const row = db.getFirstSync<TransactionDetailRow>(
    `SELECT t.id, t.merchant, t.description, t.date, a.bank as account_bank,
            t.withdrawal, t.deposit, t.category_id, c.name as category_name, c.color_index,
            t.category_override_id, t.matched_rule_id
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     JOIN categories c ON c.id = t.category_id
     WHERE t.id = ?`,
    [id]
  );
  if (!row) return null;

  let matchedRuleDescription: string | null = null;
  if (!row.category_override_id && row.matched_rule_id) {
    const rule = db.getFirstSync<{ merchant_pattern: string | null; amount_json: string | null; category_name: string }>(
      `SELECT r.merchant_pattern, r.amount_json, c.name as category_name
       FROM rules r JOIN categories c ON c.id = r.category_id
       WHERE r.id = ?`,
      [row.matched_rule_id]
    );
    if (rule) {
      matchedRuleDescription = describeRule({
        merchant: rule.merchant_pattern ?? undefined,
        amount: rule.amount_json ? JSON.parse(rule.amount_json) : undefined,
        category: rule.category_name,
      });
    }
  }

  return {
    id: row.id,
    merchant: row.merchant,
    description: row.description,
    date: row.date,
    accountBank: row.account_bank,
    withdrawal: row.withdrawal,
    deposit: row.deposit,
    categoryId: row.category_id,
    categoryName: row.category_name,
    colorIndex: row.color_index,
    isOverridden: row.category_override_id !== null,
    matchedRuleDescription,
  };
}
