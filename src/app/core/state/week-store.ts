import { Injectable, inject, signal } from '@angular/core';

import { AppDb } from '../db/app-db';
import { getWeekStartsOn, setWeekStartsOn } from '../db/settings';
import { MONDAY, todayISO, type IsoDate, type WeekStartDay } from '../lib/dates';

/**
 * The week state that outlives a single page.
 *
 * `weekStartsOn` is persisted and app-wide: the log, Insights, and settings all
 * read the one value, so a week means the same span everywhere.
 *
 * `anchorDate` is the week on screen, and there is one of it: the log and
 * Insights describe the same week of spending — one lists it, the other sums
 * it up — so moving either moves both, and switching tabs never changes which
 * week is being looked at. Anything that takes the log to a week, such as
 * saving an expense dated outside the one being viewed, takes Insights there
 * too.
 *
 * It is deliberately not persisted: the app opens on the current week after a
 * reload, not on wherever the user last browsed to.
 *
 * It lives here rather than in a page so that "a browsed week survives leaving
 * the destination" does not rest on the router happening to keep the page
 * alive.
 */
@Injectable({ providedIn: 'root' })
export class WeekStore {
  private readonly db = inject(AppDb);

  private readonly weekStartsOnState = signal<WeekStartDay>(MONDAY);

  /** First day of the week, from the persisted setting. */
  readonly weekStartsOn = this.weekStartsOnState.asReadonly();

  /** Any day inside the week the log and Insights are currently showing. */
  readonly anchorDate = signal<IsoDate>(todayISO());

  constructor() {
    getWeekStartsOn(this.db).then((day) => this.weekStartsOnState.set(day));
  }

  /** Persists a new week start and applies it immediately. */
  async changeWeekStartsOn(day: WeekStartDay): Promise<void> {
    await setWeekStartsOn(this.db, day);
    this.weekStartsOnState.set(day);
  }
}
