/**
 * The arithmetic behind the Insights destination: what a typical week is, and
 * how the week on screen stands against it.
 *
 * Everything here is pure. The screen reads day sums and renders what these
 * functions return, so every rule the spec states about the baseline — gaps
 * excluded, too little history means no comparison, headroom versus difference
 * — is checkable without a browser.
 */

import { addDays, addWeeks, startOfWeek, type IsoDate, type WeekStartDay } from './dates';

/** How many weeks before the viewed one the baseline looks at. */
export const BASELINE_WEEKS = 8;

/** Fewer weeks with expenses than this and no baseline is offered at all. */
export const MIN_BASELINE_WEEKS = 4;

export type DayTotal = {
  date: IsoDate;
  totalMinor: number;
};

/**
 * The inclusive span of days the baseline for a week is drawn from: the eight
 * whole weeks immediately before it.
 */
export function baselineRange(weekStart: IsoDate): { from: IsoDate; to: IsoDate } {
  return { from: addWeeks(weekStart, -BASELINE_WEEKS), to: addDays(weekStart, -1) };
}

/**
 * Buckets day sums into week totals, keyed by each week's first day.
 *
 * Uses `startOfWeek` so there is exactly one definition of which week a day is
 * in — the same one the log groups by. A week with no days simply has no entry.
 */
export function bucketWeekTotals(
  days: DayTotal[],
  weekStartsOn: WeekStartDay,
): Map<IsoDate, number> {
  const weeks = new Map<IsoDate, number>();

  for (const day of days) {
    const week = startOfWeek(day.date, weekStartsOn);
    weeks.set(week, (weeks.get(week) ?? 0) + day.totalMinor);
  }

  return weeks;
}

/**
 * The typical-week figure for the week starting on `weekStart`: the median of
 * the totals of the eight weeks before it, counting only weeks that recorded
 * something. `null` when fewer than four did.
 *
 * A week without expenses is a gap — missing data, not a week of no spending —
 * so it neither pulls the median down nor counts toward the four.
 *
 * Days outside the eight preceding weeks are ignored rather than trusted to
 * have been filtered by the caller, so a week later than the one on screen can
 * never leak into its baseline.
 *
 * The median of an even count is the mean of the two middle values, rounded
 * half away from zero to whole minor units, so the figure is always an amount
 * that can be displayed.
 */
export function typicalWeek(
  days: DayTotal[],
  weekStart: IsoDate,
  weekStartsOn: WeekStartDay,
): number | null {
  const { from, to } = baselineRange(weekStart);
  const preceding = days.filter((day) => day.date >= from && day.date <= to);

  const totals = Array.from(bucketWeekTotals(preceding, weekStartsOn).values())
    .filter((total) => total > 0)
    .sort((a, b) => a - b);

  if (totals.length < MIN_BASELINE_WEEKS) {
    return null;
  }

  const middle = Math.floor(totals.length / 2);

  if (totals.length % 2 === 1) {
    return totals[middle];
  }

  // Totals are positive, so rounding half up is rounding half away from zero.
  return Math.round((totals[middle - 1] + totals[middle]) / 2);
}

/**
 * A week has ended when its last day is earlier than today. A week entirely in
 * the future is therefore unfinished, which is the right reading for a week the
 * user is looking ahead to.
 */
export function weekHasEnded(weekEnd: IsoDate, today: IsoDate): boolean {
  return weekEnd < today;
}

/**
 * How a week stands against the baseline. The screen chooses the words; keeping
 * the decision apart from the sentence is what lets the rule be tested.
 */
export type Comparison = {
  kind: 'headroom' | 'above' | 'below';
  /** The distance from the baseline, never negative. */
  amountMinor: number;
};

/**
 * Headroom only for a week still in progress and strictly under the baseline —
 * it is unfinished, so being under is not yet a result. A total equal to the
 * baseline is `above` with an amount of zero, which keeps "at or above" from
 * being a third code path.
 */
export function describeComparison(
  totalMinor: number,
  baselineMinor: number,
  hasEnded: boolean,
): Comparison {
  if (totalMinor >= baselineMinor) {
    return { kind: 'above', amountMinor: totalMinor - baselineMinor };
  }

  return { kind: hasEnded ? 'below' : 'headroom', amountMinor: baselineMinor - totalMinor };
}
