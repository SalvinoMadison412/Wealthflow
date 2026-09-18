import { AppState } from 'react-native';

import { decideOnPull, PullDecision } from './syncDecision';
import { supabase } from './supabase';
import { db, subscribeToChanges } from '../db/db';
import { getSetting } from '../db/queries';
import { recategorize } from '../db/recategorize';
import { TRANSFER_CATEGORY_ID, UNCATEGORIZED_CATEGORY_ID } from '../db/schema';
import { setSetting } from '../db/transactions';

// Rules and the categories they point at are the only user data kept on
// the account (with the profile). Whole-snapshot sync: every local write
// to `rules`/`categories` pushes the full set after a short debounce; a
// sign-in pulls the server set and replaces local when local is empty
// (fresh install) or the server copy is newer (edited on another phone).
// ponytail: snapshot-level last-writer-wins; row-level merge only if two
// phones editing at once ever bites.

const SYNCED_AT = 'rules_synced_at';
const DEBOUNCE_MS = 1500;
const RESERVED = [UNCATEGORIZED_CATEGORY_ID, TRANSFER_CATEGORY_ID];

type LocalCategory = {
  id: string;
  name: string;
  color_index: number;
  bucket: string;
  monthly_budget: number | null;
  position: number;
};
type LocalRule = {
  id: string;
  merchant_pattern: string | null;
  amount_json: string | null;
  category_id: string;
  enabled: number;
  position: number;
  created_at: string;
};
type ServerCategory = LocalCategory & { updated_at: string };
type ServerRule = Omit<LocalRule, 'enabled'> & { enabled: boolean; updated_at: string };

function readLocalSnapshot() {
  const categories = db.getAllSync<LocalCategory>(
    'SELECT id, name, color_index, bucket, monthly_budget, position FROM categories WHERE id NOT IN (?, ?)',
    RESERVED
  );
  const rules = db.getAllSync<LocalRule>(
    'SELECT id, merchant_pattern, amount_json, category_id, enabled, position, created_at FROM rules'
  );
  return { categories, rules };
}

function deleteStale(table: 'rules' | 'categories', userId: string, keepIds: string[]) {
  const query = supabase.from(table).delete().eq('user_id', userId);
  return keepIds.length ? query.not('id', 'in', `(${keepIds.join(',')})`) : query;
}

async function pushRulesSnapshot(userId: string): Promise<boolean> {
  const { categories, rules } = readLocalSnapshot();
  const now = new Date().toISOString();
  const categoryRows = categories.map((c) => ({ ...c, user_id: userId, updated_at: now }));
  const ruleRows = rules.map((r) => ({ ...r, enabled: r.enabled === 1, user_id: userId, updated_at: now }));

  const steps = [
    categoryRows.length ? supabase.from('categories').upsert(categoryRows) : null,
    ruleRows.length ? supabase.from('rules').upsert(ruleRows) : null,
    deleteStale('rules', userId, ruleRows.map((r) => r.id)),
    deleteStale('categories', userId, categoryRows.map((c) => c.id)),
  ];
  for (const step of steps) {
    if (!step) continue;
    const { error } = await step;
    if (error) return false;
  }
  setSetting(SYNCED_AT, now);
  return true;
}

// Local pushes echo back through the change listener; ignore writes made
// by the pull itself for a beat longer than the debounce.
let ignoreChangesUntil = 0;

function replaceLocal(categories: ServerCategory[], rules: ServerRule[]) {
  db.withTransactionSync(() => {
    // Transactions pointing at categories about to disappear fall back to
    // Uncategorized (same order deleteCategory uses); recategorize below
    // re-sorts them by the restored rules.
    db.runSync(
      'UPDATE transactions SET category_id = ?, matched_rule_id = NULL WHERE category_id NOT IN (?, ?)',
      [UNCATEGORIZED_CATEGORY_ID, ...RESERVED]
    );
    db.runSync('UPDATE transactions SET category_override_id = NULL WHERE category_override_id NOT IN (?, ?)', RESERVED);
    db.runSync('DELETE FROM rules');
    db.runSync('DELETE FROM categories WHERE id NOT IN (?, ?)', RESERVED);
    for (const c of categories) {
      db.runSync(
        'INSERT INTO categories (id, name, color_index, bucket, monthly_budget, position) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.color_index, c.bucket, c.monthly_budget, c.position]
      );
    }
    for (const r of rules) {
      db.runSync(
        `INSERT INTO rules (id, merchant_pattern, amount_json, category_id, enabled, position, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.merchant_pattern, r.amount_json, r.category_id, r.enabled ? 1 : 0, r.position, r.created_at]
      );
    }
  });
  recategorize('all');
  ignoreChangesUntil = Date.now() + DEBOUNCE_MS + 500;
}

async function pullRulesSnapshot(userId: string): Promise<PullDecision | 'failed'> {
  const [cats, rs] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, color_index, bucket, monthly_budget, position, updated_at')
      .eq('user_id', userId),
    supabase
      .from('rules')
      .select('id, merchant_pattern, amount_json, category_id, enabled, position, created_at, updated_at')
      .eq('user_id', userId),
  ]);
  if (cats.error || rs.error) return 'failed';
  const categories = (cats.data ?? []) as ServerCategory[];
  const rules = (rs.data ?? []) as ServerRule[];

  const local = readLocalSnapshot();
  const serverNewest = [...categories, ...rules].reduce<string | null>(
    (max, r) => (!max || Date.parse(r.updated_at) > Date.parse(max) ? r.updated_at : max),
    null
  );
  const decision = decideOnPull(
    local.categories.length + local.rules.length,
    categories.length + rules.length,
    serverNewest,
    getSetting(SYNCED_AT)
  );
  if (decision === 'replace-local') {
    replaceLocal(categories, rules);
    setSetting(SYNCED_AT, serverNewest ?? new Date().toISOString());
  } else if (decision === 'push-local') {
    if (!(await pushRulesSnapshot(userId))) return 'failed';
  }
  return decision;
}

// Runs for the lifetime of a session. Nothing is pushed until the first
// pull has succeeded — pushing an empty local set before we know what the
// server holds would wipe the account's rules.
export function startRulesSync(userId: string): () => void {
  let pulled = false;
  let dirty = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const push = async () => {
    timer = null;
    if (stopped) return;
    dirty = !(await pushRulesSnapshot(userId));
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(push, DEBOUNCE_MS);
  };
  const pull = async () => {
    const result = await pullRulesSnapshot(userId);
    if (stopped || result === 'failed') return;
    pulled = true;
    if (dirty) schedule();
  };

  const unsubscribeDb = subscribeToChanges(() => {
    if (Date.now() < ignoreChangesUntil) return;
    if (pulled) schedule();
    else dirty = true;
  }, ['rules', 'categories']);
  const appState = AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    if (!pulled) pull();
    else if (dirty) schedule();
  });
  pull();

  return () => {
    stopped = true;
    unsubscribeDb();
    appState.remove();
    if (timer) clearTimeout(timer);
  };
}
