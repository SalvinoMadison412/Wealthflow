import { defaultDirection, groupByPerson, OwedRow, validateOwedSplit } from './owed';

describe('validateOwedSplit', () => {
  test('a split bill adds up', () => {
    expect(
      validateOwedSplit([{ person: ' Rahul ', amount: '400' }, { person: 'Priya', amount: '400' }], 1200)
    ).toEqual({ ok: true, entries: [{ person: 'Rahul', amount: 400 }, { person: 'Priya', amount: 400 }] });
  });

  test('rejects a missing name, a zero amount and an overshoot', () => {
    expect(validateOwedSplit([{ person: ' ', amount: '10' }], 100)).toMatchObject({ ok: false, error: 'Enter a name' });
    expect(validateOwedSplit([{ person: 'A', amount: '0' }], 100)).toMatchObject({ ok: false });
    expect(validateOwedSplit([{ person: 'A', amount: 'abc' }], 100)).toMatchObject({ ok: false });
    expect(validateOwedSplit([{ person: 'A', amount: '60' }, { person: 'B', amount: '60' }], 100)).toMatchObject({
      ok: false,
      error: 'The amounts add up to more than this transaction',
    });
  });

  test('accepts the full amount, with lakh commas', () => {
    expect(validateOwedSplit([{ person: 'A', amount: '1,200' }], 1200)).toMatchObject({ ok: true });
  });
});

const row = (id: string, person: string, amount: number, settledAt: string | null = null, date = '2026-09-28'): OwedRow => ({
  id,
  person,
  amount,
  settledAt,
  merchant: 'Swiggy',
  date,
});

describe('groupByPerson', () => {
  test('groups case-insensitively and totals only what is outstanding', () => {
    const groups = groupByPerson([row('1', 'Rahul K', 400), row('2', 'rahul k ', 300, '2026-10-01'), row('3', 'Priya', 1200)]);
    expect(groups.map((g) => [g.person, g.outstanding])).toEqual([['Priya', 1200], ['Rahul K', 400]]);
  });

  test('people fully settled sink last; settled rows sink within a person', () => {
    const groups = groupByPerson([row('1', 'Amit', 900, '2026-10-01'), row('2', 'Zoya', 50), row('3', 'Zoya', 70, '2026-10-02'), row('4', 'Zoya', 10)]);
    expect(groups.map((g) => g.person)).toEqual(['Zoya', 'Amit']);
    expect(groups[0].rows.map((r) => r.id)).toEqual(['2', '4', '3']);
  });
});

test('a debit defaults to owed to you, a credit to you owe', () => {
  expect(defaultDirection(true)).toBe('to_me');
  expect(defaultDirection(false)).toBe('by_me');
});
