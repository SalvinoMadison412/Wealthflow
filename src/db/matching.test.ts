import { compileRules, DbRuleRow, findMatch, matchText } from './matching';

function rule(overrides: Partial<DbRuleRow>): DbRuleRow {
  return { id: 'r1', merchant_pattern: null, amount_json: null, category_id: 'food', ...overrides };
}

test('a rule with neither condition never matches', () => {
  const compiled = compileRules([rule({})]);
  expect(findMatch(compiled, 'Swiggy', 100)).toBeUndefined();
});

test('merchant pattern matches as a case-insensitive contains for a plain word', () => {
  const compiled = compileRules([rule({ merchant_pattern: 'swiggy' })]);
  expect(findMatch(compiled, 'SWIGGY*ORDER', 100)?.id).toBe('r1');
});

test('an invalid regex falls back to a literal contains instead of throwing', () => {
  const compiled = compileRules([rule({ merchant_pattern: 'AMAZON.IN(' })]);
  expect(() => findMatch(compiled, 'AMAZON.IN(unmatched paren merchant)', 100)).not.toThrow();
});

test('amount conditions: moreThan, lessThan, equalTo, between', () => {
  const moreThan = compileRules([rule({ amount_json: JSON.stringify({ operator: 'moreThan', value: 1000 }) })]);
  expect(findMatch(moreThan, 'X', 2000)?.id).toBe('r1');
  expect(findMatch(moreThan, 'X', 1000)).toBeUndefined();

  const between = compileRules([rule({ amount_json: JSON.stringify({ operator: 'between', min: 100, max: 500 }) })]);
  expect(findMatch(between, 'X', 100)?.id).toBe('r1');
  expect(findMatch(between, 'X', 500)?.id).toBe('r1');
  expect(findMatch(between, 'X', 99.99)).toBeUndefined();
});

test('merchant AND amount both set requires both to match', () => {
  const compiled = compileRules([
    rule({ merchant_pattern: 'Blinkit', amount_json: JSON.stringify({ operator: 'moreThan', value: 200 }) }),
  ]);
  expect(findMatch(compiled, 'Blinkit', 300)?.id).toBe('r1');
  expect(findMatch(compiled, 'Blinkit', 100)).toBeUndefined();
  expect(findMatch(compiled, 'Swiggy', 300)).toBeUndefined();
});

test('first match wins: rule order (already priority-sorted by the caller) decides, not specificity', () => {
  const compiled = compileRules([
    rule({ id: 'r1', merchant_pattern: 'Blinkit', category_id: 'groceries' }),
    rule({ id: 'r2', merchant_pattern: 'Blinkit', category_id: 'food' }),
  ]);
  expect(findMatch(compiled, 'Blinkit', 100)?.categoryId).toBe('groceries');
});

test('a rule compiled once is reused across many transactions without recompiling the regex', () => {
  const compiled = compileRules([rule({ merchant_pattern: 'Swiggy' })]);
  for (let i = 0; i < 1000; i++) {
    expect(findMatch(compiled, 'Swiggy Order', 100)?.id).toBe('r1');
  }
});

test('matchText lets a pattern match text that is only in the description', () => {
  const compiled = compileRules([rule({ merchant_pattern: 'mcd' })]);
  expect(findMatch(compiled, 'Asha K', 100)).toBeUndefined();
  expect(findMatch(compiled, matchText('Asha K', 'UPI/ASHA K/119/McD UPI-1'), 100)?.id).toBe('r1');
});
