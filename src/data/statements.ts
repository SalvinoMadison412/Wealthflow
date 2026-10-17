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

export type KindRow = {
  id: string;
  name: string;
  colorIndex: number;
  kind: Kind | null;
  deposit: number;
  withdrawal: number;
};
export type Line = { id: string; name: string; colorIndex: number; amount: number };

// Income and Liability grow with deposits; Expense and Asset with withdrawals
// (a card payment is a withdrawal that lowers the liability, a refund a
// deposit that lowers the expense). Liability may go negative: the opening
// debt is unknown.
export function signed(kind: Kind, deposit: number, withdrawal: number): number {
  return kind === 'income' || kind === 'liability' ? deposit - withdrawal : withdrawal - deposit;
}

const EPS = 0.5;

// P&L reads `rows` as the period; Balance Sheet and check read them as
// everything to date (the screen builds twice: month rows for the P&L,
// cumulative rows for the rest). check: net worth must equal opening cash
// + net profit + unclassified, which holds exactly when the statements reconcile.
export function buildReports(rows: KindRow[], openingCash: number, closingCash: number) {
  const lines = (kind: Kind): Line[] =>
    rows
      .filter((r) => r.kind === kind)
      .map((r) => ({ id: r.id, name: r.name, colorIndex: r.colorIndex, amount: signed(kind, r.deposit, r.withdrawal) }))
      .filter((l) => Math.abs(l.amount) >= EPS);
  const sum = (ls: Line[]) => ls.reduce((s, l) => s + l.amount, 0);

  const income = lines('income');
  const expenses = lines('expense');
  const assets = lines('asset');
  const liabilities = lines('liability');
  const pl = { income, expenses, totalIncome: sum(income), totalExpenses: sum(expenses), net: sum(income) - sum(expenses) };
  const totalAssets = closingCash + sum(assets);
  const totalLiabilities = sum(liabilities);
  const bs = { cash: closingCash, assets, liabilities, totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
  const unclassified = rows.filter((r) => r.kind === null).reduce((s, r) => s + r.deposit - r.withdrawal, 0);
  const diff = bs.netWorth - (openingCash + pl.net + unclassified);
  return { pl, bs, check: { unclassified, diff, ok: Math.abs(diff) < EPS && Math.abs(unclassified) < EPS } };
}
