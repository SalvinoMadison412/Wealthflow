import { compileRules, findMatch } from '../db/matching';
import { PRESET_RULES } from './autoCategorize';

const compiled = compileRules(
  PRESET_RULES.map((r, i) => ({ id: r.category, merchant_pattern: r.pattern, amount_json: null, category_id: r.category }))
);
const categoryOf = (merchant: string) => findMatch(compiled, merchant, 100)?.categoryId ?? null;

test('every preset pattern is a valid regex', () => {
  for (const r of PRESET_RULES) expect(() => new RegExp(r.pattern, 'i')).not.toThrow();
});

test('common Indian brands land in the right category', () => {
  expect(categoryOf('Swiggy')).toBe('Food & Dining');
  expect(categoryOf('Zomato')).toBe('Food & Dining');
  expect(categoryOf('Blinkit')).toBe('Groceries');
  expect(categoryOf('DMart Ready')).toBe('Groceries');
  expect(categoryOf('Rapido')).toBe('Transport');
  expect(categoryOf('Uber India')).toBe('Transport');
  expect(categoryOf('Ola')).toBe('Transport');
  expect(categoryOf('Amazon')).toBe('Shopping');
  expect(categoryOf('Airtel Payments')).toBe('Bills & Utilities');
  expect(categoryOf('Spotify')).toBe('Subscriptions');
  expect(categoryOf('Mutual Fund SIP')).toBe('Investments');
  expect(categoryOf('Zerodha Broking')).toBe('Investments');
});

test('Swiggy Instamart is Groceries, not Food', () => {
  expect(categoryOf('Swiggy Instamart')).toBe('Groceries');
});

test('short tokens do not over-match', () => {
  expect(categoryOf('Kolar Stores')).toBeNull();
  expect(categoryOf('Viji Traders')).toBeNull();
  expect(categoryOf('Jiovanni')).toBeNull();
});

test('savings is used only for investments', () => {
  expect(PRESET_RULES.filter((r) => r.bucket === 'savings').map((r) => r.category)).toEqual(['Investments']);
});
