import { Bucket } from '../data/budget';
import { db } from './db';
import { newId } from './transactionId';

export function getOrCreateCategoryByName(name: string, bucket: Bucket = 'needs'): string {
  const existing = db.getFirstSync<{ id: string }>('SELECT id FROM categories WHERE name = ?', [name]);
  if (existing) return existing.id;

  const { max } = db.getFirstSync<{ max: number | null }>('SELECT MAX(position) as max FROM categories') ?? {
    max: null,
  };
  const position = (max ?? 0) + 1;
  const id = newId();
  db.runSync(
    'INSERT INTO categories (id, name, color_index, bucket, monthly_budget, position) VALUES (?, ?, ?, ?, NULL, ?)',
    [id, name, position % 10, bucket, position]
  );
  return id;
}
