// Bank-agnostic row reading. Statement tables differ in column order, date
// style and extras, but every transaction row, once its cells are joined into
// one line, is: [serial] date [value date] description [chq/ref] amount
// balance [junk] — or, for a few banks, date amount balance description. A
// blank Withdrawal or Deposit cell contributes no text, so a row carries
// exactly one amount plus the running balance.

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

// 07 Mar 2026 | 07-Mar-2026 | 07/03/26 | 07/03/2026 | 07-03-2026
const DATE = String.raw`\d{1,2}(?:\s+[A-Za-z]{3}\s+\d{4}|-[A-Za-z]{3}-\d{4}|[/-]\d{1,2}[/-]\d{2,4})`;
const AMOUNT = String.raw`\d[\d,]*\.\d{2}`;
const DRCR = String.raw`(?:\s*(Dr|Cr)\.?)?`;

export const OPENING_BALANCE_REGEX = /Opening Balance[^\d]*([\d,]+\.\d{2})/i;
// An opening-balance summary block can put its figures on the next line.
export const OPENING_BALANCE_LABEL_REGEX = /Opening Balance/i;
export const LEADING_AMOUNT_REGEX = new RegExp(`^\\s*(${AMOUNT})`);

const ROW_START = new RegExp(`^(?:\\d+\\s+)?(${DATE})\\s+(.+)$`);
const SECOND_DATE = new RegExp(`^(${DATE})\\s+(.+)$`);
// description amount balance [branch code]
const AMOUNTS_LAST = new RegExp(`^(.+?)\\s+(${AMOUNT})${DRCR}\\s+(${AMOUNT})${DRCR}(?:\\s+\\d{1,6})?$`);
// amount balance description (Remarks column last)
const AMOUNTS_FIRST = new RegExp(`^(${AMOUNT})${DRCR}\\s+(${AMOUNT})${DRCR}\\s+(.+)$`);

export function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

// "07 Mar 2026" | "07/03/26" | "07-03-2026" -> "2026-03-07"; null when it
// is not a real day/month (dd before mm, as Indian banks print).
export function parseDate(raw: string): string | null {
  const parts = raw.trim().split(/[\s/-]+/);
  if (parts.length !== 3) return null;
  const [day, mon, yearRaw] = parts;
  const month = /^\d+$/.test(mon) ? mon.padStart(2, '0') : MONTHS[mon.toLowerCase()];
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  if (!month || Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;
  return `${year}-${month}-${day.padStart(2, '0')}`;
}

export type ParsedRow = { date: string; description: string; amount: number; balance: number };

// null when the line is not a transaction row (headers, summaries, footers).
export function parseRow(text: string): ParsedRow | null {
  const start = text.match(ROW_START);
  const date = start && parseDate(start[1]);
  if (!start || !date) return null;

  let rest = start[2];
  // A value-date column repeats the date right after it.
  const second = rest.match(SECOND_DATE);
  if (second && parseDate(second[1])) rest = second[2];

  let description: string;
  let amount: string;
  let balance: string;
  let balanceSuffix: string | undefined;
  const last = rest.match(AMOUNTS_LAST);
  const first = last ? null : rest.match(AMOUNTS_FIRST);
  if (last) {
    [, description, amount, , balance, balanceSuffix] = last;
  } else if (first) {
    [, amount, , balance, balanceSuffix, description] = first;
  } else {
    return null;
  }

  const signed = parseAmount(balance) * (balanceSuffix?.toLowerCase() === 'dr' ? -1 : 1);
  return { date, description: description.trim(), amount: parseAmount(amount), balance: signed };
}

// Whether a lone amount was a withdrawal or a deposit isn't recoverable from
// position alone (the other column was simply blank) — but the sign of the
// balance movement always tells us, and that holds for any bank's layout.
export function inferAmounts(
  amount: number,
  balance: number,
  previousBalance: number
): { withdrawal: number | null; deposit: number | null } {
  if (balance >= previousBalance) {
    return { withdrawal: null, deposit: amount };
  }
  return { withdrawal: amount, deposit: null };
}
