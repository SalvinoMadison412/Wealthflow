import { canParseKotak, parseKotak } from './kotakParser';
import { syntheticKotakPages } from './fixtures/syntheticKotakStatement';

test('recognizes a Kotak-shaped statement', () => {
  expect(canParseKotak(syntheticKotakPages)).toBe(true);
});

test('parses opening balance and reconstructs rows out of x-order', () => {
  const statement = parseKotak(syntheticKotakPages);
  expect(statement.openingBalance).toBe(5000.0);
  expect(statement.transactions).toHaveLength(6);
});

test('UPI row: extracts canonical merchant, ref, strips Value Date suffix, infers debit', () => {
  const [tx] = parseKotak(syntheticKotakPages).transactions;
  expect(tx.merchant).toBe('Blinkit');
  expect(tx.refNo).toBe('643209064515');
  expect(tx.description).toBe('UPI/Blinkit/643209064515/PayviaRazorpay');
  expect(tx.withdrawal).toBe(350.0);
  expect(tx.deposit).toBeNull();
  expect(tx.balance).toBe(4650.0);
});

test('UPI row: a bank-truncated payee name is displayed as-is, not "fixed"', () => {
  const [, tx] = parseKotak(syntheticKotakPages).transactions;
  expect(tx.merchant).toBe('Ravi Kumar N');
  expect(tx.refNo).toBe('570897039862');
});

test('NEFT salary row is detected by keyword and inferred as a credit', () => {
  const [, , tx] = parseKotak(syntheticKotakPages).transactions;
  expect(tx.merchant).toBe('Salary Credit');
  expect(tx.deposit).toBe(20000.0);
  expect(tx.withdrawal).toBeNull();
});

test('interest row is detected by keyword and inferred as a credit', () => {
  const [, , , tx] = parseKotak(syntheticKotakPages).transactions;
  expect(tx.merchant).toBe('Interest');
  expect(tx.deposit).toBe(12.5);
});

test('merchant lookup table matches a known brand fragment inside a longer raw payee', () => {
  const [, , , , tx] = parseKotak(syntheticKotakPages).transactions;
  expect(tx.merchant).toBe('Mutual Fund SIP');
  expect(tx.withdrawal).toBe(2000.0);
});

// Discovered against the real sample statement: ~35% of its UPI rows have
// no merchant-provided note, so they collapse to "UPI/<payee> UPI-<bankRef>"
// with no slash-delimited ref/note fields at all — a second shape alongside
// the documented one.
test('UPI row with no note collapses to "UPI/<payee> UPI-<ref>" but still extracts a clean payee', () => {
  const [, , , , , tx] = parseKotak(syntheticKotakPages).transactions;
  expect(tx.merchant).toBe('Thandra Aditya');
  expect(tx.withdrawal).toBe(300.0);
});
