import { PageContent, TextItem } from '../../pdf/types';

// Made-up statements in ten other banks' table layouts, built as pdf.js
// TextItems (like syntheticKotakStatement.ts). Column order, date style and
// extras are written from memory of each bank's public statement format, so
// they are approximations: they exercise the parser's assumptions (serial
// column or not, date style, Dr/Cr suffix, trailing branch code, amount
// first), not any bank's exact PDF. UPI narrations are only realistic for
// SBI, HDFC, ICICI and Axis; the rest use a neutral shape.

type Key = 'blinkit' | 'ravi' | 'salary' | 'interest' | 'sip' | 'swiggy';
const TX: { day: number; credit: boolean; amount: number; key: Key }[] = [
  { day: 7, credit: false, amount: 350, key: 'blinkit' },
  { day: 9, credit: false, amount: 500, key: 'ravi' },
  { day: 15, credit: true, amount: 120000, key: 'salary' },
  { day: 31, credit: true, amount: 12.5, key: 'interest' },
  { day: 31, credit: false, amount: 2000, key: 'sip' },
  { day: 31, credit: false, amount: 300, key: 'swiggy' },
];
export const BANK_OPENING_BALANCE = 5000;
export const BANK_CLOSING_BALANCE = 121862.5;

const REF = '643209064515';
const NARRATION: Record<string, Record<Key, string>> = {
  sbi: {
    blinkit: `TO TRANSFER-UPI/DR/${REF}/BLINKIT/YESB/blinkit@yesbank/Payme`,
    ravi: 'TO TRANSFER-UPI/DR/570897039862/RAVI KUMAR N/UTIB/ravi@okaxis/Pay to',
    salary: 'BY TRANSFER-NEFT*HDFC0000001*N123456*ACME CORP--',
    interest: 'CREDIT INTEREST',
    sip: 'TO TRANSFER-UPI/DR/611122223333/ICCL MUTUAL FU/ICIC/iccl@icici/SIP',
    swiggy: 'TO TRANSFER-UPI/DR/608933463107/SWIGGY/YESB/swiggy@yesbank/Pay',
  },
  hdfc: {
    blinkit: `UPI-BLINKIT-BLINKIT@YESBANK-YESB0YBLUPI-${REF}-PAYMENT FROM PHONE`,
    ravi: 'UPI-RAVI KUMAR N-RAVI@OKAXIS-UTIB0000001-570897039862-PAY TO BHARATPE',
    salary: 'NEFT CR-HDFC0000001-ACME CORP-TEST USER-N123456789',
    interest: 'CREDIT INTEREST CAPITALISED',
    sip: 'UPI-ICCL MUTUAL FUND-ICCL@ICICI-ICIC0000001-611122223333-SIP PAYMENT',
    swiggy: 'UPI-SWIGGY-SWIGGY@YESBANK-YESB0YBLUPI-608933463107-ORDER',
  },
  icici: {
    blinkit: `UPI/${REF}/Payment from Ph/blinkit@yesbank/YES BANK`,
    ravi: 'UPI/570897039862/Pay to BharatPe/ravi@okaxis/AXIS BANK',
    salary: 'NEFT-N123456789-ACME CORP-',
    interest: 'Int.Pd:01-03-2026 to 31-03-2026',
    sip: 'ACH/ICCL MUTUAL FUND/611122223333',
    swiggy: 'UPI/608933463107/Order/swiggy@yesbank/YES BANK',
  },
  axis: {
    blinkit: `UPI/P2M/${REF}/BLINKIT/Payment fr/BLINKIT@YESBANK`,
    ravi: 'UPI/P2A/570897039862/RAVI KUMAR N/Pay to Bhar/ravi@okaxis',
    salary: 'NEFT/N123456789/ACME CORP',
    interest: 'INT.PD:01-03-2026 to 31-03-2026',
    sip: 'ACH-DR-ICCL MUTUAL FUND-611122223333',
    swiggy: 'UPI/P2M/608933463107/SWIGGY/Order/SWIGGY@YESBANK',
  },
  neutral: {
    blinkit: `UPI/${REF}/BLINKIT/Payment`,
    ravi: 'UPI/570897039862/RAVI KUMAR N/Pay',
    salary: 'NEFT-N123456789-ACME CORP SALARY',
    interest: 'Int.Pd 01-03-2026 to 31-03-2026',
    sip: 'ACH DR ICCL MUTUAL FUND 611122223333',
    swiggy: 'UPI/608933463107/SWIGGY/Order',
  },
};

// 5,000.00 / 1,20,000.00
const western = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function indian(n: number): string {
  const [whole, frac] = n.toFixed(2).split('.');
  const head = whole.slice(0, -3);
  const grouped = head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${whole.slice(-3)}` : whole;
  return `${grouped}.${frac}`;
}

const MON = 'Mar';
const dates = {
  dmy2: (d: number) => `${String(d).padStart(2, '0')}/03/26`,
  dmy4: (d: number) => `${String(d).padStart(2, '0')}/03/2026`,
  dmyDash: (d: number) => `${String(d).padStart(2, '0')}-03-2026`,
  dMonY: (d: number) => `${d} ${MON} 2026`,
  ddMonY: (d: number) => `${String(d).padStart(2, '0')} ${MON} 2026`,
  ddDashMonY: (d: number) => `${String(d).padStart(2, '0')}-${MON}-2026`,
};

type Cell = { i: number; date: string; desc: string; ref: string; debit?: string; credit?: string; bal: string; amt: string; dir?: 'Dr' | 'Cr' };
type Layout = {
  id: string;
  bankName: string;
  narration: keyof typeof NARRATION;
  date: (d: number) => string;
  money: (n: number) => string;
  columns: [label: string, x: number][];
  cells: (c: Cell) => (string | undefined)[];
  // Shapes seen in real SBI/HDFC PDFs: a narration wrapped onto a second
  // line (row 3) and amounts printed a few points below the date (row 2).
  wrapAndOffset?: boolean;
  // HDFC: no opening-balance line up top, a summary block after the last row
  // (its opening balance on its own baseline), and rows 5-6 on a second page
  // that does not repeat the header.
  hdfcPaging?: boolean;
};

export const BANK_LAYOUTS: Layout[] = [
  {
    id: 'sbi', bankName: 'State Bank of India', narration: 'sbi', date: dates.dMonY, money: western, wrapAndOffset: true,
    columns: [['Txn Date', 20], ['Value Date', 75], ['Description', 130], ['Ref No./Cheque No.', 400], ['Debit', 480], ['Credit', 540], ['Balance', 600]],
    cells: (c) => [c.date, c.date, c.desc, c.ref, c.debit, c.credit, c.bal],
  },
  {
    id: 'hdfc', bankName: 'HDFC Bank', narration: 'hdfc', date: dates.dmy2, money: indian, wrapAndOffset: true, hdfcPaging: true,
    columns: [['Date', 20], ['Narration', 70], ['Chq./Ref.No.', 380], ['Value Dt', 460], ['Withdrawal Amt.', 520], ['Deposit Amt.', 600], ['Closing Balance', 680]],
    cells: (c) => [c.date, c.desc, c.ref, c.date, c.debit, c.credit, c.bal],
  },
  {
    id: 'icici', bankName: 'ICICI Bank', narration: 'icici', date: dates.dmy4, money: indian,
    columns: [['S No.', 20], ['Value Date', 50], ['Transaction Date', 110], ['Cheque Number', 190], ['Transaction Remarks', 250], ['Withdrawal Amount (INR)', 520], ['Deposit Amount (INR)', 600], ['Balance (INR)', 680]],
    cells: (c) => [String(c.i), c.date, c.date, undefined, c.desc, c.debit, c.credit, c.bal],
  },
  {
    id: 'axis', bankName: 'Axis Bank', narration: 'axis', date: dates.dmyDash, money: indian,
    columns: [['SRL NO', 20], ['Tran Date', 50], ['CHQNO', 110], ['PARTICULARS', 150], ['DR', 480], ['CR', 550], ['BAL', 620], ['INIT.BR', 690]],
    cells: (c) => [String(c.i), c.date, undefined, c.desc, c.debit, c.credit, c.bal, '1234'],
  },
  {
    id: 'pnb', bankName: 'Punjab National Bank', narration: 'neutral', date: dates.dmyDash, money: indian,
    columns: [['Date', 20], ['Instrument ID', 90], ['Amount', 400], ['Type', 470], ['Balance', 520], ['Remarks', 620]],
    cells: (c) => [c.date, undefined, c.amt, c.dir, `${c.bal} Cr`, c.desc],
  },
  {
    id: 'bob', bankName: 'Bank of Baroda', narration: 'neutral', date: dates.dmyDash, money: indian,
    columns: [['Date', 20], ['Narration', 90], ['Chq.No', 420], ['Withdrawal', 480], ['Deposit', 550], ['Balance', 620]],
    cells: (c) => [c.date, c.desc, undefined, c.debit, c.credit, `${c.bal} Cr`],
  },
  {
    id: 'canara', bankName: 'Canara Bank', narration: 'neutral', date: dates.dmyDash, money: indian,
    columns: [['Txn Date', 20], ['Value Date', 80], ['Cheque No.', 140], ['Description', 200], ['Branch Code', 470], ['Debit', 530], ['Credit', 590], ['Balance', 650]],
    cells: (c) => [c.date, c.date, undefined, c.desc, '1234', c.debit, c.credit, c.bal],
  },
  {
    id: 'union', bankName: 'Union Bank of India', narration: 'neutral', date: dates.dmyDash, money: indian,
    columns: [['Date', 20], ['Particulars', 90], ['Chq Num', 420], ['Withdrawal', 480], ['Deposit', 550], ['Balance', 620]],
    cells: (c) => [c.date, c.desc, undefined, c.debit, c.credit, `${c.bal} Cr`],
  },
  {
    id: 'indusind', bankName: 'IndusInd Bank', narration: 'neutral', date: dates.ddMonY, money: indian,
    columns: [['Date', 20], ['Particulars', 90], ['Chq/Ref No', 420], ['Withdrawal', 480], ['Deposit', 550], ['Balance', 620]],
    cells: (c) => [c.date, c.desc, c.ref, c.debit, c.credit, c.bal],
  },
  {
    id: 'yes', bankName: 'Yes Bank', narration: 'neutral', date: dates.ddDashMonY, money: indian,
    columns: [['Transaction Date', 20], ['Value Date', 90], ['Description', 160], ['Cheque No', 440], ['Withdrawals', 500], ['Deposits', 570], ['Running Balance', 640]],
    cells: (c) => [c.date, c.date, c.desc, undefined, c.debit, c.credit, c.bal],
  },
];

// newestFirst: rows printed latest first (balances still chronological).
// carryRows: a "BALANCE B/F" row before the first transaction and a
// "BALANCE C/F" row after the last, each carrying only a balance.
export function syntheticBankPages(
  layout: Layout,
  opts: { newestFirst?: boolean; carryRows?: boolean } = {}
): PageContent[] {
  const pages: PageContent[] = [];
  let items: TextItem[] = [];
  let y = 560;
  const put = (x: number, text: string, dy = 0) => items.push({ str: text, x, y: y - dy, width: text.length * 4, height: 7 });
  const nextLine = (gap = 14) => {
    y -= gap;
  };
  const newPage = () => {
    pages.push({ pageNumber: pages.length + 1, items });
    items = [];
    y = 560;
  };

  put(20, layout.bankName);
  nextLine(18);
  if (!layout.hdfcPaging) {
    put(20, 'Opening Balance');
    put(200, layout.money(BANK_OPENING_BALANCE));
    nextLine(18);
  }
  for (const [label, x] of layout.columns) put(x, label);
  nextLine();

  type Entry = { tx?: (typeof TX)[number]; index: number; balance: number; carry?: string; day: number };
  let running = BANK_OPENING_BALANCE;
  let entries: Entry[] = TX.map((tx, index) => {
    running += tx.credit ? tx.amount : -tx.amount;
    return { tx, index, balance: running, day: tx.day };
  });
  if (opts.carryRows) {
    entries = [
      { index: -1, balance: BANK_OPENING_BALANCE, carry: 'BALANCE B/F', day: TX[0].day },
      ...entries,
      { index: -1, balance: running, carry: 'BALANCE C/F', day: TX[TX.length - 1].day },
    ];
  }
  if (opts.newestFirst) entries.reverse();

  entries.forEach((entry, position) => {
    if (layout.hdfcPaging && position === 4) newPage();
    if (entry.carry) {
      const cells = layout.cells({ i: 0, date: layout.date(entry.day), desc: entry.carry, ref: '', bal: layout.money(entry.balance), amt: '' });
      layout.columns.forEach(([label, x], col) => {
        const text = cells[col];
        if (!text || text === '0') return;
        if (/^\d[\d,]*\.\d{2}( Cr)?$/.test(text)) put(x + label.length * 4 - text.length * 4, text);
        else put(x, text);
      });
      nextLine(16);
      return;
    }
    const tx = entry.tx!;
    const index = entry.index;
    const balance = entry.balance;
    const money = layout.money(tx.amount);
    const desc = NARRATION[layout.narration][tx.key];
    const wrap = layout.wrapAndOffset && index === 2;
    const offset = layout.wrapAndOffset && index === 1 ? 6 : 0;
    const cells = layout.cells({
      i: index + 1,
      date: layout.date(tx.day),
      desc: wrap ? desc.slice(0, 24) : desc,
      ref: `REF${1001 + index}`,
      debit: tx.credit ? undefined : money,
      credit: tx.credit ? money : undefined,
      bal: layout.money(balance),
      amt: money,
      dir: tx.credit ? 'Cr' : 'Dr',
    });
    let descX = 0;
    layout.columns.forEach(([label, x], col) => {
      const text = cells[col];
      if (!text) return;
      if (text.startsWith(desc.slice(0, 24))) descX = x;
      // Amounts are right-aligned under their column label, as in real PDFs.
      if (/^\d[\d,]*\.\d{2}( Cr)?$/.test(text)) put(x + label.length * 4 - text.length * 4, text, offset);
      else put(x, text);
    });
    if (wrap) put(descX, desc.slice(24), 10);
    nextLine(wrap ? 26 : 16);
  });

  if (layout.hdfcPaging) {
    nextLine(10);
    put(70, 'STATEMENT SUMMARY :-');
    nextLine(10);
    for (const [label, x] of [['Opening Balance', 130], ['Dr Count', 290], ['Cr Count', 360], ['Debits', 425], ['Credits', 500], ['Closing Bal', 570]] as const) put(x, label);
    nextLine(9);
    for (const [text, x] of [['4', 300], ['2', 370], [layout.money(3150), 420], [layout.money(120012.5), 495], [layout.money(BANK_CLOSING_BALANCE), 575]] as const) put(x, text);
    put(148, layout.money(BANK_OPENING_BALANCE), 2);
  }
  newPage();
  return pages;
}
