import { AccountMonth, BalanceSummaryData, combineAccountMonths } from '../data/balance';
import { findRecurringMerchants } from '../data/recurring';
import { describeRule } from '../data/rulePattern';
import { db } from './db';
import { AUTO_MATCH_ID } from './recategorize';
import { TRANSFER_CATEGORY_ID, UNCATEGORIZED_CATEGORY_ID } from './schema';

// null/undefined = no restriction (every account). An empty array
// means "no accounts in this scope" and must return
// nothing, not everything, hence the always-false clause rather than
// silently skipping the filter.
function accountsClause(accountIds: string[] | null | undefined, alias = 't'): { clause: string; params: string[] } {
  if (accountIds == null) return { clause: '', params: [] };
  if (accountIds.length === 0) return { clause: `AND 1 = 0`, params: [] };
  return { clause: `AND ${alias}.account_id IN (${accountIds.map(() => '?').join(',')})`, params: accountIds };
}

type TransactionFilters = {
  accountId?: string;
  month?: string; // 'YYYY-MM'
  categoryId?: string;
  uncategorizedOnly?: boolean;
  direction?: 'received' | 'sent';
  minAmount?: number;
  maxAmount?: number;
  recurringOnly?: boolean;
  // Restricts to a set of account ids (ANDed with `accountId` above,
  // the Transactions screen's own single-account filter chip). Unused
  // while the app is single-user; kept for when scoping returns.
  scopeAccountIds?: string[] | null;
  sort?: TransactionSort;
};

export type TransactionSort = 'newest' | 'oldest' | 'amountHigh' | 'amountLow';

const SORT_SQL: Record<TransactionSort, string> = {
  newest: 't.date DESC, t.id DESC',
  oldest: 't.date ASC, t.id ASC',
  amountHigh: 'COALESCE(t.deposit, t.withdrawal) DESC, t.date DESC, t.id DESC',
  amountLow: 'COALESCE(t.deposit, t.withdrawal) ASC, t.date DESC, t.id DESC',
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
  const params: (string | number)[] = [];

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

  if (filters.direction === 'received') clauses.push('t.deposit IS NOT NULL');
  if (filters.direction === 'sent') clauses.push('t.withdrawal IS NOT NULL');
  if (filters.minAmount != null) {
    clauses.push('COALESCE(t.deposit, t.withdrawal) >= ?');
    params.push(filters.minAmount);
  }
  if (filters.maxAmount != null) {
    clauses.push('COALESCE(t.deposit, t.withdrawal) <= ?');
    params.push(filters.maxAmount);
  }
  if (filters.recurringOnly) {
    const merchants = listRecurringMerchants();
    if (merchants.length === 0) return [];
    clauses.push(`t.merchant IN (${merchants.map(() => '?').join(',')})`);
    params.push(...merchants);
  }

  const scope = accountsClause(filters.scopeAccountIds);

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')} ${scope.clause}` : scope.clause ? `WHERE 1 = 1 ${scope.clause}` : '';
  const rows = db.getAllSync<TransactionRow>(
    `SELECT ${TRANSACTION_ITEM_COLUMNS}
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     ${where}
     ORDER BY ${SORT_SQL[filters.sort ?? 'newest']}`,
    [...params, ...scope.params]
  );

  return rows.map(toTransactionListItem);
}

const TRANSACTION_ITEM_COLUMNS = `t.id, t.date, t.merchant, t.withdrawal, t.deposit, t.is_transfer,
            c.name as category_name, c.color_index`;

function toTransactionListItem(r: TransactionRow): TransactionListItem {
  return {
    id: r.id,
    date: r.date,
    merchant: r.merchant,
    withdrawal: r.withdrawal,
    deposit: r.deposit,
    isTransfer: r.is_transfer === 1,
    categoryName: r.category_name,
    colorIndex: r.color_index,
  };
}

// Home's "Recent" card — most recent N transactions within scope.
export function listRecentTransactions(limit: number, accountIds?: string[] | null): TransactionListItem[] {
  const scope = accountsClause(accountIds);
  const where = scope.clause ? `WHERE 1 = 1 ${scope.clause}` : '';
  const rows = db.getAllSync<TransactionRow>(
    `SELECT ${TRANSACTION_ITEM_COLUMNS}
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     ${where}
     ORDER BY t.date DESC, t.id DESC
     LIMIT ?`,
    [...scope.params, limit]
  );
  return rows.map(toTransactionListItem);
}

// Merchants that repeat across months at a near-fixed amount (see
// data/recurring.ts). Transfers are excluded.
function listRecurringMerchants(): string[] {
  const rows = db.getAllSync<{ merchant: string; month: string; amount: number }>(
    `SELECT merchant, strftime('%Y-%m', date) as month, COALESCE(withdrawal, deposit) as amount
     FROM transactions WHERE is_transfer = 0`
  );
  return findRecurringMerchants(rows);
}

// Last 12 calendar months that actually have a transaction, newest first —
// the Month filter chip's option list.
export function listMonthsWithData(accountIds?: string[] | null): string[] {
  const scope = accountsClause(accountIds, 'transactions');
  const rows = db.getAllSync<{ month: string }>(
    `SELECT DISTINCT strftime('%Y-%m', date) as month FROM transactions WHERE 1 = 1 ${scope.clause} ORDER BY month DESC LIMIT 12`,
    scope.params
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

export function countTransactionsInMonth(month: string, accountIds?: string[] | null): number {
  const scope = accountsClause(accountIds, 'transactions');
  const row = db.getFirstSync<{ n: number }>(
    `SELECT COUNT(*) as n FROM transactions WHERE strftime('%Y-%m', date) = ? ${scope.clause}`,
    [month, ...scope.params]
  );
  return row?.n ?? 0;
}

export function countUncategorized(): number {
  const row = db.getFirstSync<{ n: number }>('SELECT COUNT(*) as n FROM transactions WHERE category_id = ?', [
    UNCATEGORIZED_CATEGORY_ID,
  ]);
  return row?.n ?? 0;
}

export function hasAnyTransactions(): boolean {
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM transactions');
  return (row?.count ?? 0) > 0;
}

type TransactionDetail = {
  id: string;
  merchant: string;
  description: string;
  date: string;
  refNo: string | null;
  balance: number;
  accountBank: string;
  accountOwner: string;
  accountMasked: string | null;
  withdrawal: number | null;
  deposit: number | null;
  categoryId: string;
  categoryName: string;
  colorIndex: number;
  isOverridden: boolean;
  matchedRuleDescription: string | null;
  autoCategorised: boolean;
};

type TransactionDetailRow = {
  id: string;
  merchant: string;
  description: string;
  date: string;
  ref_no: string | null;
  balance: number;
  account_bank: string;
  account_owner: string;
  account_masked: string | null;
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
    `SELECT t.id, t.merchant, t.description, t.date, t.ref_no, t.balance,
            a.bank as account_bank, a.owner_label as account_owner, a.masked_number as account_masked,
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
  if (!row.category_override_id && row.matched_rule_id && row.matched_rule_id !== AUTO_MATCH_ID) {
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
    refNo: row.ref_no,
    balance: row.balance,
    accountBank: row.account_bank,
    accountOwner: row.account_owner,
    accountMasked: row.account_masked,
    withdrawal: row.withdrawal,
    deposit: row.deposit,
    categoryId: row.category_id,
    categoryName: row.category_name,
    colorIndex: row.color_index,
    isOverridden: row.category_override_id !== null,
    matchedRuleDescription,
    autoCategorised: !row.category_override_id && row.matched_rule_id === AUTO_MATCH_ID,
  };
}

type MonthlyTotal = { month: string; income: number; expense: number };

// `monthsBack` calendar months ending at `endMonth`, oldest first,
// zero-filled so the chart always shows a fixed number of bars — the
// Home bar chart's input. Transfers are excluded from both totals.
export function getMonthlyTotals(monthsBack: number, endMonth: string, accountIds?: string[] | null): MonthlyTotal[] {
  const [endYear, endMon] = endMonth.split('-').map(Number);
  const months: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(endYear, endMon - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const scope = accountsClause(accountIds, 'transactions');
  const rows = db.getAllSync<{ month: string; income: number; expense: number }>(
    `SELECT strftime('%Y-%m', date) as month,
            COALESCE(SUM(deposit), 0) as income,
            COALESCE(SUM(withdrawal), 0) as expense
     FROM transactions
     WHERE is_transfer = 0 AND strftime('%Y-%m', date) IN (${months.map(() => '?').join(',')}) ${scope.clause}
     GROUP BY month`,
    [...months, ...scope.params]
  );
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return months.map((m) => byMonth.get(m) ?? { month: m, income: 0, expense: 0 });
}

type MonthSummary = { income: number; expense: number };

// Home's "Net" card for one month. Excludes transfers, same as the chart.
export function getMonthSummary(month: string, accountIds?: string[] | null): MonthSummary {
  const scope = accountsClause(accountIds, 'transactions');
  const row = db.getFirstSync<{ income: number; expense: number }>(
    `SELECT COALESCE(SUM(deposit), 0) as income, COALESCE(SUM(withdrawal), 0) as expense
     FROM transactions
     WHERE is_transfer = 0 AND strftime('%Y-%m', date) = ? ${scope.clause}`,
    [month, ...scope.params]
  );
  return { income: row?.income ?? 0, expense: row?.expense ?? 0 };
}

// Opening / inflows / outflows / closing for one month, from each
// account's running balance. The closing row is the chronologically last
// one (rows are inserted in statement order, so rowid breaks same-day
// ties). Transfers are included: this is the account's actual money in
// and out, unlike the income/expense cards. null = no data that month.
export function getBalanceSummary(month: string, accountIds?: string[] | null): BalanceSummaryData | null {
  const scope = accountsClause(accountIds, 't');
  const rows = db.getAllSync<AccountMonth>(
    `SELECT COALESCE(SUM(t.deposit), 0) as inflows,
            COALESCE(SUM(t.withdrawal), 0) as outflows,
            (SELECT t2.balance FROM transactions t2
              WHERE t2.account_id = t.account_id AND strftime('%Y-%m', t2.date) = ?
              ORDER BY t2.date DESC, t2.rowid DESC LIMIT 1) as closing
     FROM transactions t
     WHERE strftime('%Y-%m', t.date) = ? ${scope.clause}
     GROUP BY t.account_id`,
    [month, month, ...scope.params]
  );
  return combineAccountMonths(rows);
}

export type RuleListItem = {
  id: string;
  enabled: boolean;
  description: string;
  categoryName: string;
  colorIndex: number;
};

// Every rule (enabled or not), in priority order — the Rules screen's
// source of truth. `description` is the same plain-language summary the
// categorize sheet shows for a matched rule.
export function listRulesForDisplay(): RuleListItem[] {
  const rows = db.getAllSync<{
    id: string;
    merchant_pattern: string | null;
    amount_json: string | null;
    enabled: number;
    category_name: string;
    color_index: number;
  }>(
    `SELECT r.id, r.merchant_pattern, r.amount_json, r.enabled, c.name as category_name, c.color_index
     FROM rules r
     JOIN categories c ON c.id = r.category_id
     ORDER BY r.position ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    enabled: r.enabled === 1,
    description: describeRule({
      merchant: r.merchant_pattern ?? undefined,
      amount: r.amount_json ? JSON.parse(r.amount_json) : undefined,
      category: r.category_name,
    }),
    categoryName: r.category_name,
    colorIndex: r.color_index,
  }));
}

export type CategoryBudgetRow = {
  id: string;
  name: string;
  colorIndex: number;
  monthlyBudget: number | null;
  spent: number;
  txCount: number;
};

// Every category (except Transfer — it's not a spend category) with its
// spend for the given month. The screen filters to "spend > 0 or budget
// set" itself — categories is a small table, unlike transactions, so
// that client-side filter on an already-tiny joined result is fine.
export function getCategoryBudgetRows(month: string, accountIds?: string[] | null): CategoryBudgetRow[] {
  const scope = accountsClause(accountIds);
  const rows = db.getAllSync<{
    id: string;
    name: string;
    color_index: number;
    monthly_budget: number | null;
    spent: number;
    tx_count: number;
  }>(
    `SELECT c.id, c.name, c.color_index, c.monthly_budget,
            COALESCE((SELECT SUM(t.withdrawal) FROM transactions t
                      WHERE t.category_id = c.id AND t.is_transfer = 0
                        AND strftime('%Y-%m', t.date) = ? ${scope.clause}), 0) as spent,
            (SELECT COUNT(*) FROM transactions t
              WHERE t.category_id = c.id AND t.is_transfer = 0 AND t.withdrawal > 0
                AND strftime('%Y-%m', t.date) = ? ${scope.clause}) as tx_count
     FROM categories c
     WHERE c.id != ?
     ORDER BY c.position ASC`,
    [month, ...scope.params, month, ...scope.params, TRANSFER_CATEGORY_ID]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    colorIndex: r.color_index,
    monthlyBudget: r.monthly_budget,
    spent: r.spent,
    txCount: r.tx_count,
  }));
}

export type StatementListItem = {
  id: string;
  bank: string;
  ownerLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  importedAt: string;
  reconciledOk: boolean;
  transactionCount: number;
};

// Every import, newest first — the Statements history screen.
export function listStatements(): StatementListItem[] {
  const rows = db.getAllSync<{
    id: string;
    bank: string;
    owner_label: string;
    period_start: string | null;
    period_end: string | null;
    imported_at: string;
    reconciled_ok: number;
    tx_count: number;
  }>(
    `SELECT s.id, a.bank, a.owner_label, s.period_start, s.period_end, s.imported_at, s.reconciled_ok,
       (SELECT COUNT(*) FROM transactions t WHERE t.statement_id = s.id) as tx_count
     FROM statements s JOIN accounts a ON a.id = s.account_id
     ORDER BY s.imported_at DESC`
  );
  return rows.map((r) => ({
    id: r.id,
    bank: r.bank,
    ownerLabel: r.owner_label,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    importedAt: r.imported_at,
    reconciledOk: r.reconciled_ok === 1,
    transactionCount: r.tx_count,
  }));
}

export function getSetting(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

