// Pure — no expo-sqlite/supabase import, so it's unit tested directly
// (see rulesSync.ts for the caller).
export type PullDecision = 'replace-local' | 'push-local' | 'nothing';

// The one decision in this file, kept pure for the test.
export function decideOnPull(
  localCount: number,
  serverCount: number,
  serverNewest: string | null,
  syncedAt: string | null
): PullDecision {
  if (localCount === 0 && serverCount === 0) return 'nothing';
  if (localCount === 0) return 'replace-local';
  if (serverNewest && (!syncedAt || Date.parse(serverNewest) > Date.parse(syncedAt))) return 'replace-local';
  return 'push-local';
}
