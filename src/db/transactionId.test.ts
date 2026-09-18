import { makeTransactionId } from './transactionId';

const base = {
  accountId: 'hdfc|4821',
  date: '2026-03-07',
  withdrawal: 412 as number | null,
  deposit: null as number | null,
  balance: 18420.5,
  refNo: 'REF1' as string | null,
  description: 'Swiggy Order',
};

test('the same input always produces the same id', () => {
  expect(makeTransactionId(base)).toBe(makeTransactionId({ ...base }));
});

test('re-importing the same statement is a no-op via the id, not a lookup', () => {
  const a = makeTransactionId(base);
  const b = makeTransactionId({ ...base });
  expect(a).toBe(b);
});

test('a different balance produces a different id (same-day duplicate transactions disambiguate)', () => {
  const a = makeTransactionId(base);
  const b = makeTransactionId({ ...base, balance: 18008.5 });
  expect(a).not.toBe(b);
});

test('withdrawal vs. deposit are distinguished, not just the numeric value', () => {
  const a = makeTransactionId({ ...base, withdrawal: 200, deposit: null });
  const b = makeTransactionId({ ...base, withdrawal: null, deposit: 200 });
  expect(a).not.toBe(b);
});

test('description whitespace is normalized so incidental formatting differences do not create duplicates', () => {
  const a = makeTransactionId({ ...base, description: 'Swiggy   Order' });
  const b = makeTransactionId({ ...base, description: '  Swiggy Order  ' });
  expect(a).toBe(b);
});

test('a null refNo is distinct from an empty-string refNo collision with another field', () => {
  const a = makeTransactionId({ ...base, refNo: null });
  const b = makeTransactionId({ ...base, refNo: '' });
  expect(a).toBe(b); // both serialize to '', which is correct: "no ref" is one case
});


import { makeDedupeKey } from './transactionId';

const { accountId: _account, ...row } = base;

test('dedupe key ignores the account: the same statement in two accounts collapses', () => {
  expect(makeDedupeKey(row)).toBe(makeDedupeKey({ ...row }));
});

test('with a bank ref, balance and description formatting do not matter', () => {
  expect(makeDedupeKey({ ...row, balance: 1, description: 'x' })).toBe(makeDedupeKey({ ...row, balance: 2, description: 'y' }));
});

test('both legs of a transfer sharing a ref stay distinct', () => {
  const out = makeDedupeKey({ ...row, withdrawal: 500, deposit: null });
  const inn = makeDedupeKey({ ...row, withdrawal: null, deposit: 500 });
  expect(out).not.toBe(inn);
});

test('without a ref, falls back to date/amount/balance/description with whitespace normalised', () => {
  const a = makeDedupeKey({ ...row, refNo: null, description: 'Interest  credit ' });
  expect(a).toBe(makeDedupeKey({ ...row, refNo: null, description: 'Interest credit' }));
  expect(a).not.toBe(makeDedupeKey({ ...row, refNo: null, description: 'Interest credit', balance: 1 }));
});
