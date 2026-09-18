import { SQLiteDatabase } from 'expo-sqlite';

// Seeded once at migration v1 — the only categories that ship out of the
// box (CLAUDE.md: categorization rules, and the categories they target,
// are entirely user-built). Never assign either index to a user category.
export const UNCATEGORIZED_CATEGORY_ID = 'uncategorized';
export const TRANSFER_CATEGORY_ID = 'transfer';

const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    bank TEXT NOT NULL,
    masked_number TEXT,
    owner_label TEXT NOT NULL DEFAULT 'Me',
    created_at TEXT NOT NULL
  );

  CREATE TABLE statements (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    period_start TEXT,
    period_end TEXT,
    opening REAL NOT NULL,
    closing REAL NOT NULL,
    reconciled_ok INTEGER NOT NULL,
    imported_at TEXT NOT NULL
  );

  CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color_index INTEGER NOT NULL,
    bucket TEXT NOT NULL CHECK (bucket IN ('needs', 'wants', 'savings')),
    monthly_budget REAL,
    position INTEGER NOT NULL
  );

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    statement_id TEXT NOT NULL REFERENCES statements(id),
    account_id TEXT NOT NULL REFERENCES accounts(id),
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    merchant TEXT NOT NULL,
    ref_no TEXT,
    withdrawal REAL,
    deposit REAL,
    balance REAL NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    matched_rule_id TEXT,
    category_override_id TEXT REFERENCES categories(id),
    is_transfer INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_transactions_date ON transactions(date);
  CREATE INDEX idx_transactions_account ON transactions(account_id);
  CREATE INDEX idx_transactions_statement ON transactions(statement_id);

  CREATE TABLE rules (
    id TEXT PRIMARY KEY,
    merchant_pattern TEXT,
    amount_json TEXT,
    category_id TEXT NOT NULL REFERENCES categories(id),
    enabled INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT INTO categories (id, name, color_index, bucket, monthly_budget, position) VALUES
    ('${UNCATEGORIZED_CATEGORY_ID}', 'Uncategorized', 9, 'wants', NULL, -2),
    ('${TRANSFER_CATEGORY_ID}', 'Transfer', 7, 'needs', NULL, -1);
  `,
  // v2: the Wants bucket is gone; fold existing categories into Needs.
  // ponytail: v1's CHECK still allows 'wants' (SQLite can't alter a CHECK
  // without rebuilding the table and its three foreign keys); the app
  // never writes it. Rebuild the table if the constraint ever matters.
  `UPDATE categories SET bucket = 'needs' WHERE bucket = 'wants';`,
];

// PRAGMA user_version-keyed migrations — each entry runs once, in its own
// transaction, the first time a database opens at a lower version.
export function migrate(db: SQLiteDatabase): void {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  for (let version = currentVersion; version < MIGRATIONS.length; version++) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[version]);
      db.execSync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
