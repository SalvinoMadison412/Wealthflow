import { categorizeTransaction, UNCATEGORIZED } from './categorize';
import { Rule } from './RulesContext';
import { Transaction } from '../statement/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    date: '2026-03-07',
    description: 'test',
    merchant: 'Blinkit',
    refNo: null,
    withdrawal: 350,
    deposit: null,
    balance: 100,
    raw: 'test',
    ...overrides,
  };
}

test('no rules means everything is Uncategorized', () => {
  expect(categorizeTransaction([], tx({}))).toBe(UNCATEGORIZED);
});

test('a rule with neither condition set never matches', () => {
  const rules: Rule[] = [{ id: '1', category: 'Food' }];
  expect(categorizeTransaction(rules, tx({}))).toBe(UNCATEGORIZED);
});

test('merchant-only rule matches as a case-insensitive contains', () => {
  const rules: Rule[] = [{ id: '1', merchant: 'blinkit', category: 'Food' }];
  expect(categorizeTransaction(rules, tx({ merchant: 'Blinkit' }))).toBe('Food');
});

test('moreThan', () => {
  const rules: Rule[] = [{ id: '1', amount: { operator: 'moreThan', value: 1000 }, category: 'Big Ticket' }];
  expect(categorizeTransaction(rules, tx({ withdrawal: 2000 }))).toBe('Big Ticket');
  expect(categorizeTransaction(rules, tx({ withdrawal: 1000 }))).toBe(UNCATEGORIZED);
});

test('lessThan', () => {
  const rules: Rule[] = [{ id: '1', amount: { operator: 'lessThan', value: 50 }, category: 'Minor' }];
  expect(categorizeTransaction(rules, tx({ withdrawal: 20 }))).toBe('Minor');
  expect(categorizeTransaction(rules, tx({ withdrawal: 50 }))).toBe(UNCATEGORIZED);
});

test('equalTo, including a decimal amount', () => {
  const rules: Rule[] = [{ id: '1', amount: { operator: 'equalTo', value: 98.92 }, category: 'Exact' }];
  expect(categorizeTransaction(rules, tx({ withdrawal: 98.92 }))).toBe('Exact');
  expect(categorizeTransaction(rules, tx({ withdrawal: 98.93 }))).toBe(UNCATEGORIZED);
});

test('between is inclusive on both ends', () => {
  const rules: Rule[] = [{ id: '1', amount: { operator: 'between', min: 100, max: 500 }, category: 'Mid' }];
  expect(categorizeTransaction(rules, tx({ withdrawal: 100 }))).toBe('Mid');
  expect(categorizeTransaction(rules, tx({ withdrawal: 500 }))).toBe('Mid');
  expect(categorizeTransaction(rules, tx({ withdrawal: 99.99 }))).toBe(UNCATEGORIZED);
  expect(categorizeTransaction(rules, tx({ withdrawal: 500.01 }))).toBe(UNCATEGORIZED);
});

test('merchant AND amount both set requires both to match', () => {
  const rules: Rule[] = [
    { id: '1', merchant: 'Blinkit', amount: { operator: 'moreThan', value: 200 }, category: 'Big Blinkit' },
  ];
  expect(categorizeTransaction(rules, tx({ merchant: 'Blinkit', withdrawal: 300 }))).toBe('Big Blinkit');
  expect(categorizeTransaction(rules, tx({ merchant: 'Blinkit', withdrawal: 100 }))).toBe(UNCATEGORIZED);
  expect(categorizeTransaction(rules, tx({ merchant: 'Swiggy', withdrawal: 300 }))).toBe(UNCATEGORIZED);
});

test('first match wins over a later, also-matching rule', () => {
  const rules: Rule[] = [
    { id: '1', merchant: 'Blinkit', category: 'Groceries' },
    { id: '2', merchant: 'Blinkit', category: 'Food' },
  ];
  expect(categorizeTransaction(rules, tx({ merchant: 'Blinkit' }))).toBe('Groceries');
});
