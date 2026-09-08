// Shared by every bank template (and the generic fallback): a blank
// Withdrawal or Deposit cell contributes zero text items when a row is
// reconstructed, so every transaction line ends in exactly two decimal
// numbers — <amount> <runningBalance>, in that order. This regex is
// therefore bank-agnostic; a "template" only needs to say *whether* it
// recognizes a statement and how to turn a row's description into a nicer
// merchant/description pair.
export const ROW_REGEX =
  /^\d+\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/;

export const OPENING_BALANCE_REGEX = /Opening Balance[^\d]*([\d,]+\.\d{2})/i;

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

export function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

// "07 Mar 2026" -> "2026-03-07"
export function parseStatementDate(raw: string): string {
  const [day, mon, year] = raw.trim().split(/\s+/);
  const month = MONTHS[mon.toLowerCase().slice(0, 3)];
  return `${year}-${month}-${day.padStart(2, '0')}`;
}

// Whether a row's lone trailing amount was a withdrawal or a deposit isn't
// recoverable from position alone (the other column was simply blank) —
// but the sign of the balance movement always tells us, and that holds for
// any bank's layout, not just Kotak's.
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
