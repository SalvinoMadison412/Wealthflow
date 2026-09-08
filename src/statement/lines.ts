import { Line, TextItem } from './types';

const Y_TOLERANCE = 2;

// pdf.js hands back a flat, per-page stream of positioned text items with no
// row/column structure. Bank statement tables are row-oriented, so this is
// the seam that turns positions back into the text lines the layout implies:
// cluster items whose baselines are within Y_TOLERANCE of each other, then
// read each cluster left-to-right.
export function groupIntoLines(items: TextItem[]): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; items: TextItem[] }[] = [];

  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= Y_TOLERANCE);
    if (line) {
      line.items.push(item);
    } else {
      lines.push({ y: item.y, items: [item] });
    }
  }

  return lines.map((line) => ({
    y: line.y,
    text: line.items
      .sort((a, b) => a.x - b.x)
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  }));
}
