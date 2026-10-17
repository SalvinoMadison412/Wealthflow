import { parseDate, parseRow } from './rowParsing';

describe('parseDate', () => {
  test.each([
    ['07 Mar 2026', '2026-03-07'],
    ['7 Mar 2026', '2026-03-07'],
    ['07-Mar-2026', '2026-03-07'],
    ['07/03/26', '2026-03-07'],
    ['07/03/2026', '2026-03-07'],
    ['07-03-2026', '2026-03-07'],
  ])('%s', (raw, iso) => expect(parseDate(raw)).toBe(iso));

  test('rejects things that are not a day/month', () => {
    expect(parseDate('13/13/2026')).toBeNull();
    expect(parseDate('32 Mar 2026')).toBeNull();
    expect(parseDate('07 Foo 2026')).toBeNull();
  });
});

describe('parseRow', () => {
  const expected = { date: '2026-03-07', description: 'UPI/x', amount: 350, balance: 4650 };

  test.each([
    ['serial + d Mon yyyy (Kotak)', '1 07 Mar 2026 UPI/x 350.00 4,650.00'],
    ['no serial, dd/mm/yy', '07/03/26 UPI/x 350.00 4,650.00'],
    ['serial + dd-mm-yyyy', '1 07-03-2026 UPI/x 350.00 4,650.00'],
    ['value date after the date', '7 Mar 2026 7 Mar 2026 UPI/x 350.00 4,650.00'],
    ['trailing branch code', '1 07-03-2026 UPI/x 350.00 4,650.00 1234'],
    ['Dr/Cr on the balance', '07-03-2026 UPI/x 350.00 4,650.00 Cr'],
    ['amounts straight after the date', '07-03-2026 350.00 Dr 4,650.00 Cr UPI/x'],
  ])('%s', (_name, text) => expect(parseRow(text)).toEqual(expected));

  test('lakh grouping', () => {
    expect(parseRow('07-03-2026 Salary 1,20,000.00 1,24,650.00')).toMatchObject({ amount: 120000, balance: 124650 });
  });

  test('a Dr balance is an overdraft', () => {
    expect(parseRow('07-03-2026 Fee 350.00 650.00 Dr')).toMatchObject({ balance: -650 });
  });

  test('a description that contains an amount keeps it', () => {
    expect(parseRow('07-03-2026 Charges 25.00 GST 4.50 350.00 4,650.00')?.description).toBe('Charges 25.00 GST 4.50');
  });

  test.each([
    'Opening Balance 5,000.00',
    'Date Narration Withdrawal Deposit Balance',
    'Statement From : 01/03/2026 To : 31/03/2026',
    'Page 1 of 3',
    '31-02-2026x 350.00 4,650.00',
  ])('not a transaction row: %s', (text) => expect(parseRow(text)).toBeNull());
});
