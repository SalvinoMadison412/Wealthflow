import { decideOnPull } from './syncDecision';

const T1 = '2026-09-18T10:00:00.000Z';
const T2 = '2026-09-18T11:00:00+00:00'; // Postgres formatting, later than T1

test('both empty: nothing to do', () => {
  expect(decideOnPull(0, 0, null, null)).toBe('nothing');
});

test('fresh install with server data: replace local', () => {
  expect(decideOnPull(0, 3, T1, null)).toBe('replace-local');
});

test('local data, never synced: push local', () => {
  expect(decideOnPull(2, 0, null, null)).toBe('push-local');
});

test('server edited after last sync: replace local', () => {
  expect(decideOnPull(2, 2, T2, T1)).toBe('replace-local');
});

test('server not newer than last sync: push local', () => {
  expect(decideOnPull(2, 2, T1, T1)).toBe('push-local');
  expect(decideOnPull(2, 2, T1, T2)).toBe('push-local');
});
