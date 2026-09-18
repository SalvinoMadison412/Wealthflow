import { describeRule, suggestPattern } from './rulePattern';

test('AMAZON.IN escapes the dot', () => {
  expect(suggestPattern('AMAZON.IN')).toBe('AMAZON\\.IN');
});

test('SWIGGY*ORDER-8812 drops everything from the * separator onward', () => {
  expect(suggestPattern('SWIGGY*ORDER-8812')).toBe('SWIGGY');
});

test('trailing all-digit/#/- reference tokens are dropped', () => {
  expect(suggestPattern('BIG BAZAAR STORE 4821')).toBe('BIG BAZAAR');
  expect(suggestPattern('UPI-REF-991234')).toBe('UPI-REF-991234'); // a single token, nothing to drop
});

test('only the first two remaining words are kept', () => {
  expect(suggestPattern('Reliance Retail Fresh Mart')).toBe('RELIANCE RETAIL');
});

test('a merchant that is only digits/*/-/# falls back to the full text rather than an empty pattern', () => {
  expect(suggestPattern('12345')).toBe('12345');
});

test('invalid or edge-case input never throws', () => {
  expect(() => suggestPattern('')).not.toThrow();
  expect(() => suggestPattern('   ')).not.toThrow();
  expect(() => suggestPattern('***')).not.toThrow();
  expect(() => suggestPattern('a'.repeat(500))).not.toThrow();
});

test('the escaped pattern is always a safe literal regex', () => {
  const pattern = suggestPattern('AMAZON.IN(PVT)*');
  expect(() => new RegExp(pattern, 'i')).not.toThrow();
  expect(new RegExp(pattern, 'i').test('AMAZON.IN(PVT)')).toBe(true);
});

test('describeRule combines merchant and amount with AND', () => {
  expect(
    describeRule({ merchant: 'Swiggy', amount: { operator: 'moreThan', value: 500 }, category: 'Food' })
  ).toBe('Description contains "Swiggy" and Amount is more than ₹500 → Food');
});

test('describeRule with only a merchant condition', () => {
  expect(describeRule({ merchant: 'Swiggy', category: 'Food' })).toBe(
    'Description contains "Swiggy" → Food'
  );
});

test('describeRule with neither condition set', () => {
  expect(describeRule({ category: 'Food' })).toBe('Always → Food');
});
