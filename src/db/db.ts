import { addDatabaseChangeListener, openDatabaseSync } from 'expo-sqlite';

import { migrate } from './schema';
import { makeDedupeKey } from './transactionId';

const DATABASE_NAME = 'wealthflow.db';

// Opened once, at first import — this file is imported before anything
// renders (RulesContext/TransactionsContext import it directly), so the
// database and its migrations are ready before any screen mounts.
export const db = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
db.execSync('PRAGMA foreign_keys = ON;');
migrate(db);

// One-off after v3: gives pre-existing rows their dedupe_key and deletes
// any that turn out to be duplicates (oldest row wins). Finds nothing to do
// on every launch after the first.
function backfillDedupeKeys(): void {
  const rows = db.getAllSync<{
    id: string;
    date: string;
    withdrawal: number | null;
    deposit: number | null;
    balance: number;
    ref_no: string | null;
    description: string;
  }>('SELECT id, date, withdrawal, deposit, balance, ref_no, description FROM transactions WHERE dedupe_key IS NULL ORDER BY rowid');
  if (rows.length === 0) return;
  db.withTransactionSync(() => {
    for (const r of rows) {
      const key = makeDedupeKey({ ...r, refNo: r.ref_no });
      const taken = db.getFirstSync('SELECT 1 FROM transactions WHERE dedupe_key = ?', [key]);
      if (taken) db.runSync('DELETE FROM transactions WHERE id = ?', [r.id]);
      else db.runSync('UPDATE transactions SET dedupe_key = ? WHERE id = ?', [key, r.id]);
    }
  });
}
backfillDedupeKeys();

// Fires after any write anywhere in the database, or only for writes to
// `tables` when given. Most screens just want "something changed, re-run
// my query"; rules sync wants only rules/categories.
export function subscribeToChanges(listener: () => void, tables?: string[]): () => void {
  const subscription = addDatabaseChangeListener((event) => {
    if (!event.databaseFilePath.endsWith(DATABASE_NAME)) return;
    if (tables && !tables.includes(event.tableName)) return;
    listener();
  });
  return () => subscription.remove();
}
