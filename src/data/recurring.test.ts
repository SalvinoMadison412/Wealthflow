import { findRecurringMerchants } from './recurring';

test('a fixed amount in two months is recurring', () => {
  const rows = [
    { merchant: 'NETFLIX', month: '2026-06', amount: 649 },
    { merchant: 'NETFLIX', month: '2026-07', amount: 649 },
  ];
  expect(findRecurringMerchants(rows)).toEqual(['NETFLIX']);
});

test('one month of history is not recurring', () => {
  const rows = [
    { merchant: 'RENT', month: '2026-07', amount: 20000 },
    { merchant: 'RENT', month: '2026-07', amount: 20000 },
  ];
  expect(findRecurringMerchants(rows)).toEqual([]);
});

test('wildly varying amounts are not recurring', () => {
  const rows = [
    { merchant: 'SWIGGY', month: '2026-06', amount: 210 },
    { merchant: 'SWIGGY', month: '2026-07', amount: 640 },
  ];
  expect(findRecurringMerchants(rows)).toEqual([]);
});

test('small drift within ten percent still counts', () => {
  const rows = [
    { merchant: 'ELECTRICITY', month: '2026-05', amount: 1000 },
    { merchant: 'ELECTRICITY', month: '2026-06', amount: 1060 },
    { merchant: 'ELECTRICITY', month: '2026-07', amount: 950 },
  ];
  expect(findRecurringMerchants(rows)).toEqual(['ELECTRICITY']);
});
