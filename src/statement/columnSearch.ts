import { PageContent, TextItem } from '../pdf/types';
import { Amounts, Band, bandsOn, ColumnRead, DRCR, readBands, rightEdge } from './columns';
import { groupIntoLines } from './lines';
import { parseAmount, rowStartDate } from './rowParsing';

// When a statement's header isn't recognised (unusual or Hindi labels, no
// header, one Amount column plus a Dr/Cr type), find the columns from the
// numbers themselves: group amounts by right edge, try every role
// assignment, and keep the one the running balance proves. Deterministic,
// and it needs no knowledge of the bank.

// Two decimals required, so reference numbers never form a column.
const AMOUNT = /^(?:₹|Rs\.?|INR)?\s*(-)?(\d[\d,]*\.\d{2})(?:\s*(Dr|Cr)\.?)?$/i;
const CLUSTER_TOLERANCE = 15; // pt between right edges in one column
const MAX_CLUSTERS = 6; // caps the search at ~300 hypotheses (two edges)
const TYPE_DISTANCE = 130; // pt from an amount to a separate Dr/Cr column (either side)
const MIN_ROWS = 4;
const MIN_SHARE = 0.9;

// "Dr" | "DEBIT" -> 'dr'; "Cr" | "CREDIT" -> 'cr'.
function directionOf(marker: string | undefined): 'dr' | 'cr' | undefined {
  return marker ? (marker[0].toLowerCase() === 'd' ? 'dr' : 'cr') : undefined;
}

type Token = { band: Band; value: number; minus: boolean; marker?: 'dr' | 'cr'; cluster: number };

// A separate Dr/Cr (or DEBIT/CREDIT) cell belongs to the amount nearest to it
// on the same line (IDBI prints it left of the amount, PNB right of it).
function markersByAmount(items: TextItem[]): Map<number, string> {
  // An amount that carries its own Dr/Cr suffix (a balance printed "4,650.00 Cr")
  // needs no marker, and must not take the one meant for the amount beside it.
  const amounts = items.flatMap((item, index) => {
    const m = item.str.trim().match(AMOUNT);
    return m && !m[3] ? [index] : [];
  });
  const found = new Map<number, string>();
  const nearestGap = new Map<number, number>();
  items.forEach((cell) => {
    const m = cell.str.trim().match(DRCR);
    if (!m) return;
    let best: { index: number; gap: number } | undefined;
    for (const index of amounts) {
      const amount = items[index];
      const gap = cell.x >= rightEdge(amount) ? cell.x - rightEdge(amount) : amount.x - rightEdge(cell);
      if (gap < 0 || gap > TYPE_DISTANCE) continue;
      if (!best || gap < best.gap) best = { index, gap };
    }
    if (best && best.gap < (nearestGap.get(best.index) ?? Infinity)) {
      found.set(best.index, m[1]);
      nearestGap.set(best.index, best.gap);
    }
  });
  return found;
}

type RawToken = Omit<Token, 'cluster'> & { left: number; right: number };

function tokensIn(bands: Band[]): RawToken[] {
  const tokens: RawToken[] = [];
  for (const band of bands) {
    for (const line of band.lines) {
      const markers = markersByAmount(line.items);
      line.items.forEach((item, i) => {
        const m = item.str.trim().match(AMOUNT);
        if (!m) return;
        const right = rightEdge(item);
        // pdf.js puts blank spacer items between runs; skip them.
        const marker = directionOf(m[3] ?? markers.get(i));
        tokens.push({ band, value: parseAmount(m[2]), minus: Boolean(m[1]), marker: marker as Token['marker'], left: item.x, right });
      });
    }
  }
  return tokens;
}

// Groups tokens into columns by one edge (amounts are usually right-aligned,
// sometimes left-aligned); returns the busiest columns.
function cluster(tokens: RawToken[], edge: 'left' | 'right'): Token[] {
  const sorted = [...tokens].sort((a, b) => a[edge] - b[edge]);
  const groups: RawToken[][] = [];
  for (const token of sorted) {
    const last = groups[groups.length - 1];
    if (last && token[edge] - last[last.length - 1][edge] <= CLUSTER_TOLERANCE) last.push(token);
    else groups.push([token]);
  }
  const kept = groups
    .filter((group) => group.length >= 2)
    .sort((a, b) => b.length - a.length)
    .slice(0, MAX_CLUSTERS);
  return kept.flatMap((group, index) => group.map(({ left: _l, right: _r, ...token }) => ({ ...token, cluster: index })));
}

type Hypothesis = (band: Band) => Amounts;

function hypotheses(tokens: Token[], clusters: number): Hypothesis[] {
  const byBand = new Map<Band, Token[]>();
  for (const token of tokens) byBand.set(token.band, [...(byBand.get(token.band) ?? []), token]);
  const balanceOf = (t: Token) => (t.marker === 'dr' ? -t.value : t.value);
  const read = (assign: (t: Token, found: Amounts) => void): Hypothesis => (band) => {
    const found: Amounts = { debit: [], credit: [], balance: [] };
    for (const token of byBand.get(band) ?? []) assign(token, found);
    return found;
  };

  const all: Hypothesis[] = [];
  for (let b = 0; b < clusters; b++) {
    for (let a = 0; a < clusters; a++) {
      if (a === b) continue;
      // One amount column: direction from a Dr/Cr marker, or from a minus sign.
      all.push(
        read((t, f) => {
          if (t.cluster === b) f.balance.push(balanceOf(t));
          else if (t.cluster === a && t.marker) (t.marker === 'dr' ? f.debit : f.credit).push(t.value);
        }),
        read((t, f) => {
          if (t.cluster === b) f.balance.push(balanceOf(t));
          else if (t.cluster === a) (t.minus ? f.debit : f.credit).push(t.value);
        })
      );
      // Separate withdrawal and deposit columns.
      for (let c = 0; c < clusters; c++) {
        if (c === a || c === b) continue;
        all.push(
          read((t, f) => {
            if (t.cluster === b) f.balance.push(balanceOf(t));
            else if (t.cluster === a) f.debit.push(t.value);
            else if (t.cluster === c) f.credit.push(t.value);
          })
        );
      }
    }
  }
  return all;
}

// Rows that follow from the previous balance.
function chained(read: ColumnRead): number {
  return read.coverage.rowsRead - read.coverage.mismatchDates.length;
}

// The same reading reached by two hypotheses counts once.
function signature(read: ColumnRead): string {
  return read.transactions.map((t) => `${t.withdrawal ?? ''}|${t.deposit ?? ''}|${t.balance}`).join(';');
}

// null unless exactly one reading clearly wins: it chains at least MIN_ROWS
// rows and MIN_SHARE of all rows, beats every other reading by a margin, and
// ends on the statement's printed closing balance when there is one.
export function searchColumns(
  pages: PageContent[],
  openingBalance: number | null,
  closingBalance: number | null
): ColumnRead | null {
  const bands: Band[] = [];
  for (const page of pages) {
    const lines = groupIntoLines(page.items);
    const starts = lines.filter((line) => rowStartDate(line.text)).map((line) => Math.round(line.items[0].x));
    if (starts.length === 0) continue;
    // The date column: where most dated lines start.
    const counts = new Map<number, number>();
    for (const x of starts) counts.set(x, (counts.get(x) ?? 0) + 1);
    const dateX = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
    // Dated lines above the table with no amounts (a "01 Mar - 31 Mar"
    // statement period) are not rows.
    const pageBands = bandsOn(lines, dateX);
    const firstRow = pageBands.findIndex((band) =>
      band.lines.some((line) => line.items.some((item) => AMOUNT.test(item.str.trim())))
    );
    if (firstRow >= 0) bands.push(...pageBands.slice(firstRow));
  }
  if (bands.length === 0) return null;

  const raw = tokensIn(bands);
  const readings = new Map<string, ColumnRead>();
  for (const edge of ['right', 'left'] as const) {
    const tokens = cluster(raw, edge);
    const clusters = new Set(tokens.map((t) => t.cluster)).size;
    if (clusters < 2) continue;
    for (const hypothesis of hypotheses(tokens, clusters)) {
      const read = readBands(bands, openingBalance, hypothesis, 'search');
      if (read.transactions.length > 0) readings.set(signature(read), read);
    }
  }
  const ranked = [...readings.values()].sort((a, b) => chained(b) - chained(a));
  const [best, runnerUp] = ranked;
  if (!best) return null;

  const rows = best.coverage.rowsInPdf;
  const score = chained(best);
  if (score < MIN_ROWS || score < MIN_SHARE * rows) return null;
  if (runnerUp && chained(runnerUp) > score - Math.max(2, Math.ceil(0.1 * rows))) return null;
  const last = best.transactions[best.transactions.length - 1];
  if (closingBalance !== null && Math.abs(last.balance - closingBalance) > 0.01) return null;
  return best;
}
