import { parseStatement } from './registry';
import { reconcile } from './reconciliation';
import {
  EXPECTED_CLOSING_BALANCE,
  EXPECTED_OPENING_BALANCE,
  EXPECTED_TRANSACTION_COUNT,
  syntheticKotakPages,
} from './fixtures/syntheticKotakStatement';

test('opening balance + credits - debits reconciles to the closing balance', () => {
  const statement = parseStatement(syntheticKotakPages);
  expect(statement.openingBalance).toBe(EXPECTED_OPENING_BALANCE);
  expect(statement.closingBalance).toBe(EXPECTED_CLOSING_BALANCE);
  expect(statement.transactions).toHaveLength(EXPECTED_TRANSACTION_COUNT);

  const result = reconcile(statement);
  expect(result.ok).toBe(true);
  expect(result.delta).toBe(0);
});

test('flags a mismatch when a balance is off', () => {
  const statement = parseStatement(syntheticKotakPages);
  const tampered = { ...statement, closingBalance: statement.closingBalance + 50 };

  const result = reconcile(tampered);
  expect(result.ok).toBe(false);
  expect(result.delta).toBe(-50);
});
