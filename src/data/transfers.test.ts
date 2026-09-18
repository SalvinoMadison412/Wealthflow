import { detectTransferPairs, TransferCandidate } from './transfers';

function tx(overrides: Partial<TransferCandidate>): TransferCandidate {
  return { id: 'x', accountId: 'a', date: '2026-03-10', withdrawal: null, deposit: null, ...overrides };
}

test('a matched pair (equal amount, different accounts, within 2 days) is marked', () => {
  const pairs = detectTransferPairs([
    tx({ id: 't1', accountId: 'acct-a', date: '2026-03-10', withdrawal: 20000 }),
    tx({ id: 't2', accountId: 'acct-b', date: '2026-03-11', deposit: 20000 }),
  ]);
  expect(pairs).toEqual([['t1', 't2']]);
});

test('unequal amounts are not matched', () => {
  const pairs = detectTransferPairs([
    tx({ id: 't1', accountId: 'acct-a', date: '2026-03-10', withdrawal: 20000 }),
    tx({ id: 't2', accountId: 'acct-b', date: '2026-03-10', deposit: 19999 }),
  ]);
  expect(pairs).toEqual([]);
});

test('a 3-day gap is not matched (max is 2 days)', () => {
  const pairs = detectTransferPairs([
    tx({ id: 't1', accountId: 'acct-a', date: '2026-03-10', withdrawal: 20000 }),
    tx({ id: 't2', accountId: 'acct-b', date: '2026-03-13', deposit: 20000 }),
  ]);
  expect(pairs).toEqual([]);
});

test('exactly a 2-day gap is matched (boundary is inclusive)', () => {
  const pairs = detectTransferPairs([
    tx({ id: 't1', accountId: 'acct-a', date: '2026-03-10', withdrawal: 20000 }),
    tx({ id: 't2', accountId: 'acct-b', date: '2026-03-12', deposit: 20000 }),
  ]);
  expect(pairs).toEqual([['t1', 't2']]);
});

test('same account is never a transfer, even with a matching amount and date', () => {
  const pairs = detectTransferPairs([
    tx({ id: 't1', accountId: 'acct-a', date: '2026-03-10', withdrawal: 20000 }),
    tx({ id: 't2', accountId: 'acct-a', date: '2026-03-10', deposit: 20000 }),
  ]);
  expect(pairs).toEqual([]);
});

test('one transaction cannot match twice — the nearest-dated match wins', () => {
  const pairs = detectTransferPairs([
    tx({ id: 't1', accountId: 'acct-a', date: '2026-03-10', withdrawal: 20000 }),
    tx({ id: 't2', accountId: 'acct-b', date: '2026-03-12', deposit: 20000 }),
    tx({ id: 't3', accountId: 'acct-b', date: '2026-03-10', deposit: 20000 }),
  ]);
  // t3 is same-day (gap 0) vs t2's gap of 2 — t3 wins, t2 is left unmatched.
  expect(pairs).toEqual([['t1', 't3']]);
});

test('a withdrawal with no matching deposit anywhere is left unmatched', () => {
  const pairs = detectTransferPairs([tx({ id: 't1', accountId: 'acct-a', withdrawal: 500 })]);
  expect(pairs).toEqual([]);
});

test('amounts within the paisa tolerance still match', () => {
  const pairs = detectTransferPairs([
    tx({ id: 't1', accountId: 'acct-a', withdrawal: 20000.001 }),
    tx({ id: 't2', accountId: 'acct-b', deposit: 20000.0 }),
  ]);
  expect(pairs).toEqual([['t1', 't2']]);
});
