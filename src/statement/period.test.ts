import { matchPeriod } from './registry';

test.each([
  ['Statement Period: 01-10-2026 to 15-10-2026', '2026-10-01', '2026-10-15'],
  ['For the period 01/10/2026 To 15/10/2026', '2026-10-01', '2026-10-15'],
  ['From : 01-Oct-2026 To : 15-Oct-2026', '2026-10-01', '2026-10-15'],
  ['Statement from 01 Oct 2026 to 15 Oct 2026', '2026-10-01', '2026-10-15'],
  ['Period 01/10/26 - 15/10/26', '2026-10-01', '2026-10-15'],
])('reads %s', (text, start, end) => {
  expect(matchPeriod(text)).toEqual({ start, end });
});

test('ignores lines that are not a period', () => {
  expect(matchPeriod('Opening Balance 4,650.00')).toBeUndefined();
  expect(matchPeriod('Transferred from 01-10-2026')).toBeUndefined();
});

test('rejects a period that ends before it starts', () => {
  expect(matchPeriod('Period 15-10-2026 to 01-10-2026')).toBeUndefined();
});
