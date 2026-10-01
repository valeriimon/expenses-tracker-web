/**
 * Every date operation in the app goes through this module.
 *
 * Expenses are stored as calendar days (`YYYY-MM-DD`), not instants — an
 * expense belongs to "the 8th", not to a moment that a timezone change can
 * shift into a different day. See the archived bootstrap design and this
 * change's design.md for the reasoning.
 *
 * All arithmetic runs on UTC-anchored Dates. Adding 7 days in UTC is always
 * exactly 7 days; doing it on a local-midnight Date lands an hour off across a
 * DST boundary and can roll into the wrong day.
 */

/** A calendar day in `YYYY-MM-DD` form. */
export type IsoDate = string;

/** Day of the week, Sunday = 0 through Saturday = 6 — matching `Date.getDay()`. */
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const MONDAY: WeekStartDay = 1;

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function pad4(n: number): string {
  return String(n).padStart(4, '0');
}

/** Parses `YYYY-MM-DD` into a Date anchored at UTC midnight. */
function parseIso(iso: IsoDate): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Formats a UTC-anchored Date back to `YYYY-MM-DD`. */
function formatIso(date: Date): IsoDate {
  return `${pad4(date.getUTCFullYear())}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * The device's current calendar day.
 *
 * Built from the local date parts on purpose. `new Date().toISOString()` would
 * give the UTC day, which is the previous day every evening in UTC+3 — the
 * prefilled date would silently be wrong for several hours each night.
 */
export function todayISO(): IsoDate {
  return fromLocalDate(new Date());
}

/**
 * Converts a Date produced by the native date picker (local midnight) into a
 * calendar day. Reads local parts, for the same reason `todayISO` does.
 */
export function fromLocalDate(date: Date): IsoDate {
  return `${pad4(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Converts a calendar day into a Date at local midnight, which is what the
 * native date picker expects to be handed.
 */
export function toLocalDate(iso: IsoDate): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Day of the week for a calendar day, Sunday = 0. */
export function dayOfWeek(iso: IsoDate): WeekStartDay {
  return parseIso(iso).getUTCDay() as WeekStartDay;
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = parseIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIso(date);
}

export function addWeeks(iso: IsoDate, weeks: number): IsoDate {
  return addDays(iso, weeks * 7);
}

/** First day of the week containing `iso`, given the configured week start. */
export function startOfWeek(iso: IsoDate, weekStartsOn: WeekStartDay): IsoDate {
  const offset = (dayOfWeek(iso) - weekStartsOn + 7) % 7;
  return addDays(iso, -offset);
}

/** Last day of the week containing `iso`, given the configured week start. */
export function endOfWeek(iso: IsoDate, weekStartsOn: WeekStartDay): IsoDate {
  return addDays(startOfWeek(iso, weekStartsOn), 6);
}

/** The seven calendar days of the week containing `iso`, in order. */
export function eachDayOfWeek(iso: IsoDate, weekStartsOn: WeekStartDay): IsoDate[] {
  const start = startOfWeek(iso, weekStartsOn);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** True when both days fall in the same week under the given week start. */
export function isSameWeek(a: IsoDate, b: IsoDate, weekStartsOn: WeekStartDay): boolean {
  return startOfWeek(a, weekStartsOn) === startOfWeek(b, weekStartsOn);
}

/** Day-group heading, e.g. `Fri, 8 Aug`. */
export function formatDayLabel(iso: IsoDate): string {
  const date = parseIso(iso);
  return `${WEEKDAY_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTH_SHORT[date.getUTCMonth()]}`;
}

/**
 * Week range for the log header, collapsing whatever the two ends share:
 * `4 – 10 Aug 2026`, `28 Jul – 3 Aug 2026`, `29 Dec 2025 – 4 Jan 2026`.
 */
export function formatWeekRange(from: IsoDate, to: IsoDate): string {
  const start = parseIso(from);
  const end = parseIso(to);

  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = MONTH_SHORT[start.getUTCMonth()];
  const endMonth = MONTH_SHORT[end.getUTCMonth()];
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear !== endYear) {
    return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
  }
  if (startMonth !== endMonth) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
  }
  return `${startDay} – ${endDay} ${startMonth} ${startYear}`;
}

/** Fuller label for the entry form, where the year matters: `Sat, 8 Aug 2026`. */
export function formatFullDate(iso: IsoDate): string {
  return `${formatDayLabel(iso)} ${parseIso(iso).getUTCFullYear()}`;
}
