// Pure — no expo-sqlite import, unit tested directly.
export type Kind = 'income' | 'expense' | 'asset' | 'liability';
export const KINDS: Kind[] = ['income', 'expense', 'asset', 'liability'];

// A category's type when nothing says otherwise (seeded rows, a sync pull
// from before `kind` existed, a preset's name). Uncategorized has no kind
// and never goes through here.
export function defaultKind(name: string): Kind {
  if (name === 'Income') return 'income';
  if (name === 'Investments' || name === 'Transfer') return 'asset';
  if (name === 'Credit card & loans') return 'liability';
  return 'expense';
}
