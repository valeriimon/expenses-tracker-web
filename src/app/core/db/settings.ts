import { MONDAY, type WeekStartDay } from '../lib/dates';

import type { AppDb } from './app-db';

const WEEK_STARTS_ON_KEY = 'week_starts_on';

/**
 * The configured first day of the week, Monday when the user has never chosen
 * one. A stored value outside 0-6 is treated as absent rather than trusted —
 * the whole log's grouping depends on this being a real weekday.
 */
export async function getWeekStartsOn(db: AppDb): Promise<WeekStartDay> {
  const stored = await db.settings.get(WEEK_STARTS_ON_KEY);
  if (stored === undefined) {
    return MONDAY;
  }

  const parsed = Number(stored.value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
    return MONDAY;
  }

  return parsed as WeekStartDay;
}

export async function setWeekStartsOn(db: AppDb, day: WeekStartDay): Promise<void> {
  await db.settings.put({ key: WEEK_STARTS_ON_KEY, value: String(day) });
}
