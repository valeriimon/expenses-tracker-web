import {
  addDays,
  addWeeks,
  dayOfWeek,
  eachDayOfWeek,
  endOfWeek,
  formatDayLabel,
  formatFullDate,
  formatWeekRange,
  fromLocalDate,
  isSameWeek,
  startOfWeek,
  toLocalDate,
  todayISO,
  type WeekStartDay,
} from './dates';

// Reference points used throughout. 2026-08-08 is a Saturday.
const SATURDAY = '2026-08-08';

describe('todayISO', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the local calendar day, not the UTC one', () => {
    // 22:00 UTC is already 01:00 the next day in Europe/Kyiv (UTC+3 in August).
    vi.useFakeTimers().setSystemTime(new Date('2026-08-08T22:00:00Z'));

    expect(todayISO()).toBe('2026-08-09');
    // What a toISOString().slice(0, 10) implementation would have returned —
    // the previous day, wrong for three hours of every night.
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-08-08');
  });

  it('agrees with UTC during the middle of the local day', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-08-08T09:00:00Z'));

    expect(todayISO()).toBe('2026-08-08');
  });
});

describe('dayOfWeek', () => {
  it('reports Sunday as 0 through Saturday as 6', () => {
    expect(dayOfWeek('2026-08-02')).toBe(0);
    expect(dayOfWeek('2026-08-03')).toBe(1);
    expect(dayOfWeek(SATURDAY)).toBe(6);
  });
});

describe('startOfWeek', () => {
  it('returns the date itself when it is already the week start', () => {
    // 2026-08-03 is a Monday.
    expect(startOfWeek('2026-08-03', 1)).toBe('2026-08-03');
  });

  it('goes back a full week for the day before the week start', () => {
    // Sunday 2026-08-02, with weeks starting Monday, belongs to the week that
    // began on 2026-07-27 — not to the one starting the next day.
    expect(startOfWeek('2026-08-02', 1)).toBe('2026-07-27');
  });

  it('handles every week-start day for one fixed date', () => {
    // 2026-08-08 is a Saturday, so each week start lands on the most recent
    // occurrence of that weekday at or before it.
    const expected: Record<WeekStartDay, string> = {
      0: '2026-08-02', // Sunday
      1: '2026-08-03', // Monday
      2: '2026-08-04', // Tuesday — the boundary the reference journal uses
      3: '2026-08-05', // Wednesday
      4: '2026-08-06', // Thursday
      5: '2026-08-07', // Friday
      6: '2026-08-08', // Saturday, the date itself
    };

    for (const [day, start] of Object.entries(expected)) {
      expect(startOfWeek(SATURDAY, Number(day) as WeekStartDay)).toBe(start);
    }
  });

  it('crosses a year boundary', () => {
    // 2026-01-01 is a Thursday; its Monday-started week began in 2025.
    expect(startOfWeek('2026-01-01', 1)).toBe('2025-12-29');
  });
});

describe('endOfWeek', () => {
  it('is six days after the start', () => {
    expect(endOfWeek('2026-08-05', 1)).toBe('2026-08-09');
    expect(endOfWeek('2026-08-05', 2)).toBe('2026-08-10');
  });

  it('crosses a year boundary', () => {
    expect(endOfWeek('2025-12-31', 1)).toBe('2026-01-04');
  });
});

describe('addDays / addWeeks', () => {
  it('crosses month ends', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-08-01', -1)).toBe('2026-07-31');
  });

  it('crosses the year boundary in both directions', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('moves whole weeks', () => {
    expect(addWeeks('2026-08-08', 1)).toBe('2026-08-15');
    expect(addWeeks('2026-08-08', -1)).toBe('2026-08-01');
    expect(addWeeks('2026-08-08', 0)).toBe('2026-08-08');
  });

  it('is unaffected by the spring DST transition', () => {
    // Europe/Kyiv springs forward on 2026-03-29. A local-midnight
    // implementation loses an hour here and can land on the wrong day.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addWeeks('2026-03-25', 1)).toBe('2026-04-01');
  });

  it('is unaffected by the autumn DST transition', () => {
    // Europe/Kyiv falls back on 2026-10-25.
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addWeeks('2026-10-21', 1)).toBe('2026-10-28');
  });
});

describe('startOfWeek across DST', () => {
  it('groups a DST-transition week as seven whole days', () => {
    // The week containing the spring-forward Sunday, starting Monday.
    expect(startOfWeek('2026-03-29', 1)).toBe('2026-03-23');
    expect(endOfWeek('2026-03-29', 1)).toBe('2026-03-29');
    expect(eachDayOfWeek('2026-03-29', 1)).toHaveLength(7);
  });
});

describe('eachDayOfWeek', () => {
  it('lists seven consecutive days beginning at the week start', () => {
    expect(eachDayOfWeek(SATURDAY, 1)).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ]);
  });
});

describe('isSameWeek', () => {
  it('depends on the configured week start', () => {
    // Monday 2026-08-03 and Sunday 2026-08-09 share a Monday-started week,
    // but fall either side of a Tuesday-started one.
    expect(isSameWeek('2026-08-03', '2026-08-09', 1)).toBe(true);
    expect(isSameWeek('2026-08-03', '2026-08-09', 2)).toBe(false);
  });
});

describe('local Date conversion', () => {
  it('round-trips a calendar day through the picker representation', () => {
    expect(fromLocalDate(toLocalDate(SATURDAY))).toBe(SATURDAY);
    expect(fromLocalDate(toLocalDate('2026-03-29'))).toBe('2026-03-29');
    expect(fromLocalDate(toLocalDate('2026-01-01'))).toBe('2026-01-01');
  });

  it('produces local midnight, so the picker opens on the right day', () => {
    const date = toLocalDate(SATURDAY);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(8);
    expect(date.getHours()).toBe(0);
  });
});

describe('formatting', () => {
  it('labels a day with its weekday and date', () => {
    expect(formatDayLabel(SATURDAY)).toBe('Sat, 8 Aug');
    expect(formatDayLabel('2026-01-01')).toBe('Thu, 1 Jan');
  });

  it('labels a full date with its year', () => {
    expect(formatFullDate(SATURDAY)).toBe('Sat, 8 Aug 2026');
    expect(formatFullDate('2025-12-31')).toBe('Wed, 31 Dec 2025');
  });

  it('collapses a week range that shares a month', () => {
    expect(formatWeekRange('2026-08-03', '2026-08-09')).toBe('3 – 9 Aug 2026');
  });

  it('spells out both months when the week spans two', () => {
    expect(formatWeekRange('2026-07-28', '2026-08-03')).toBe('28 Jul – 3 Aug 2026');
  });

  it('spells out both years when the week spans two', () => {
    expect(formatWeekRange('2025-12-29', '2026-01-04')).toBe('29 Dec 2025 – 4 Jan 2026');
  });
});
