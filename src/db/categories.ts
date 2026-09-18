import { db } from './db';
import { newId } from './transactionId';

// ponytail: categories.bucket is a leftover of the removed Needs/Savings
// budget split; always 'needs', kept only to avoid a table rebuild and a
// Supabase migration. Drop it if the table is ever rebuilt.
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
    [id, name, position % 10, 'needs', position]
  );
  return id;
}
