import { addDatabaseChangeListener, openDatabaseSync } from 'expo-sqlite';

import { migrate } from './schema';

const DATABASE_NAME = 'wealthflow.db';

// Opened once, at first import — this file is imported before anything
// renders (RulesContext/TransactionsContext import it directly), so the
// database and its migrations are ready before any screen mounts.
export const db = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
db.execSync('PRAGMA foreign_keys = ON;');
migrate(db);

// Fires after any write anywhere in the database. Callers filter further
// (e.g. by table) only if they need to — most screens just want "something
// changed, re-run my query."
export function subscribeToChanges(listener: () => void): () => void {
  const subscription = addDatabaseChangeListener((event) => {
    if (event.databaseFilePath.endsWith(DATABASE_NAME)) listener();
  });
  return () => subscription.remove();
}
