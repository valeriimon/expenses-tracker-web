import type { Expense } from '../../core/db/expenses';

import { groupByDay } from './group-by-day';

function expense(id: string, occurredOn: string, amountMinor: number): Expense {
  return {
    id,
    occurredOn,
    description: id,
    amountMinor,
    categoryId: 'other',
    categoryName: 'Other',
  };
}

describe('groupByDay', () => {
  it('returns no sections and a zero total for an empty week', () => {
    expect(groupByDay([])).toEqual({ sections: [], totalMinor: 0 });
  });

  it('groups consecutive rows by day and totals each day and the week', () => {
    const { sections, totalMinor } = groupByDay([
      expense('c', '2026-08-08', 150),
      expense('b', '2026-08-08', 250),
      expense('a', '2026-08-05', 1000),
    ]);

    expect(totalMinor).toBe(1400);
    expect(sections.map((s) => [s.date, s.title, s.totalMinor, s.expenses.map((e) => e.id)])).toEqual([
      ['2026-08-08', 'Sat, 8 Aug', 400, ['c', 'b']],
      ['2026-08-05', 'Wed, 5 Aug', 1000, ['a']],
    ]);
  });
});
