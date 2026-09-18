import { addDatabaseChangeListener, openDatabaseSync } from 'expo-sqlite';

import { migrate } from './schema';

const DATABASE_NAME = 'wealthflow.db';

// Opened once, at first import — this file is imported before anything
// renders (RulesContext/TransactionsContext import it directly), so the
// database and its migrations are ready before any screen mounts.
export const db = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
db.execSync('PRAGMA foreign_keys = ON;');
migrate(db);

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
