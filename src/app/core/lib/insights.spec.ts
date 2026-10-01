import { MONDAY } from './dates';
import {
  baselineRange,
  bucketWeekTotals,
  describeComparison,
  typicalWeek,
  weekHasEnded,
  type DayTotal,
} from './insights';

// 2026-08-03 is a Monday. The eight weeks before it start on 2026-06-08.
const WEEK = '2026-08-03';

/** One day sum in the nth week before `WEEK` (1 = the week immediately before). */
function weekBefore(n: number, totalMinor: number): DayTotal {
  const date = new Date(Date.UTC(2026, 7, 3 - n * 7 + 2));
  return { date: date.toISOString().slice(0, 10), totalMinor };
}

describe('baselineRange', () => {
  it('spans the eight whole weeks before the viewed one', () => {
    expect(baselineRange(WEEK)).toEqual({ from: '2026-06-08', to: '2026-08-02' });
  });
});

describe('bucketWeekTotals', () => {
  it('sums days into the week they fall in', () => {
    const weeks = bucketWeekTotals(
      [
        { date: '2026-07-27', totalMinor: 100 },
        { date: '2026-08-02', totalMinor: 50 },
        { date: '2026-08-03', totalMinor: 7 },
      ],
      MONDAY,
    );

    expect(Array.from(weeks)).toEqual([
      ['2026-07-27', 150],
      ['2026-08-03', 7],
    ]);
  });

  it('puts days on both boundaries in the right week under a Sunday start', () => {
    // Under a Sunday start, Sat 2026-08-01 closes one week and Sun 2026-08-02
    // opens the next — under Monday the two would share a week.
    const weeks = bucketWeekTotals(
      [
        { date: '2026-07-26', totalMinor: 1 },
        { date: '2026-08-01', totalMinor: 2 },
        { date: '2026-08-02', totalMinor: 4 },
        { date: '2026-08-08', totalMinor: 8 },
      ],
      0,
    );

    expect(Array.from(weeks)).toEqual([
      ['2026-07-26', 3],
      ['2026-08-02', 12],
    ]);
  });
});

describe('typicalWeek', () => {
  it('is the median of an odd number of qualifying weeks', () => {
    const days = [weekBefore(1, 500), weekBefore(2, 100), weekBefore(3, 900), weekBefore(4, 300), weekBefore(5, 700)];

    expect(typicalWeek(days, WEEK, MONDAY)).toBe(500);
  });

  it('is the mean of the two middle weeks for an even count, rounded half away from zero', () => {
    const days = [weekBefore(1, 100), weekBefore(2, 201), weekBefore(3, 300), weekBefore(4, 400)];

    // (201 + 300) / 2 = 250.5
    expect(typicalWeek(days, WEEK, MONDAY)).toBe(251);
  });

  it('treats weeks without expenses as gaps, not zeros', () => {
    // Weeks 2, 4, 6 and 8 back recorded nothing. The median is over the four
    // that did, not over eight with four zeros.
    const days = [weekBefore(1, 400), weekBefore(3, 400), weekBefore(5, 400), weekBefore(7, 400)];

    expect(typicalWeek(days, WEEK, MONDAY)).toBe(400);
  });

  it('offers no baseline below four qualifying weeks', () => {
    const three = [weekBefore(1, 400), weekBefore(3, 400), weekBefore(5, 400)];

    expect(typicalWeek(three, WEEK, MONDAY)).toBeNull();
    expect(typicalWeek([...three, weekBefore(8, 400)], WEEK, MONDAY)).toBe(400);
  });

  it('does not count gaps toward the four weeks required', () => {
    const days = [weekBefore(1, 400), weekBefore(2, 0), weekBefore(3, 400), weekBefore(4, 400)];

    expect(typicalWeek(days, WEEK, MONDAY)).toBeNull();
  });

  it('ignores the viewed week, later weeks, and weeks more than eight back', () => {
    const days = [
      weekBefore(1, 100),
      weekBefore(2, 100),
      weekBefore(3, 100),
      weekBefore(4, 100),
      weekBefore(9, 99_999),
      { date: WEEK, totalMinor: 99_999 },
      { date: '2026-08-12', totalMinor: 99_999 },
    ];

    expect(typicalWeek(days, WEEK, MONDAY)).toBe(100);
  });

  it('adds several days of one week together before taking the median', () => {
    const days = [
      { date: '2026-07-27', totalMinor: 100 },
      { date: '2026-07-29', totalMinor: 100 },
      weekBefore(2, 200),
      weekBefore(3, 200),
      weekBefore(4, 200),
    ];

    expect(typicalWeek(days, WEEK, MONDAY)).toBe(200);
  });
});

describe('weekHasEnded', () => {
  it('is false on the last day of the week and true the day after', () => {
    expect(weekHasEnded('2026-08-09', '2026-08-09')).toBe(false);
    expect(weekHasEnded('2026-08-09', '2026-08-10')).toBe(true);
  });

  it('treats a week entirely in the future as unfinished', () => {
    expect(weekHasEnded('2026-08-23', '2026-08-05')).toBe(false);
  });
});

describe('describeComparison', () => {
  it('reports an unfinished week under the baseline as headroom', () => {
    expect(describeComparison(300, 1000, false)).toEqual({ kind: 'headroom', amountMinor: 700 });
  });

  it('reports a total equal to the baseline as above by zero', () => {
    expect(describeComparison(1000, 1000, false)).toEqual({ kind: 'above', amountMinor: 0 });
    expect(describeComparison(1000, 1000, true)).toEqual({ kind: 'above', amountMinor: 0 });
  });

  it('reports a week over the baseline as above whether or not it has ended', () => {
    expect(describeComparison(1250, 1000, false)).toEqual({ kind: 'above', amountMinor: 250 });
    expect(describeComparison(1250, 1000, true)).toEqual({ kind: 'above', amountMinor: 250 });
  });

  it('reports a completed week under the baseline as below, never as headroom', () => {
    expect(describeComparison(300, 1000, true)).toEqual({ kind: 'below', amountMinor: 700 });
  });
});
