import { Component, computed, inject } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

import { AppDb } from '../../core/db/app-db';
import { sumByCategory, sumByDay } from '../../core/db/expenses';
import { formatMinor, formatMinorBare } from '../../core/lib/currency';
import { addWeeks, endOfWeek, startOfWeek, todayISO } from '../../core/lib/dates';
import {
  baselineRange,
  describeComparison,
  typicalWeek,
  weekHasEnded,
} from '../../core/lib/insights';
import { live } from '../../core/state/live';
import { WeekStore } from '../../core/state/week-store';
import { BalanceRuleComponent } from '../../ui/balance-rule.component';
import { MeasureRuleComponent } from '../../ui/measure-rule.component';
import { WeekHeaderComponent } from '../../ui/week-header.component';
import { WeekTransitionComponent } from '../../ui/week-transition.component';

/**
 * What one week cost, where it went, and whether it is unusual for this user.
 *
 * The week here is the one the log shows: the two share it, so moving either
 * moves both, and it is bounded by the same week-start setting.
 */
@Component({
  selector: 'app-insights',
  templateUrl: 'insights.page.html',
  styleUrls: ['insights.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    BalanceRuleComponent,
    MeasureRuleComponent,
    WeekHeaderComponent,
    WeekTransitionComponent,
  ],
})
export class InsightsPage {
  private readonly db = inject(AppDb);
  protected readonly weeks = inject(WeekStore);

  protected readonly formatMinor = formatMinor;
  protected readonly formatMinorBare = formatMinorBare;

  protected readonly weekStart = computed(() =>
    startOfWeek(this.weeks.anchorDate(), this.weeks.weekStartsOn()),
  );
  protected readonly weekEnd = computed(() =>
    endOfWeek(this.weeks.anchorDate(), this.weeks.weekStartsOn()),
  );

  /**
   * Both reads are issued together and land together, so the breakdown and the
   * comparison never appear a frame apart.
   */
  private readonly figures = live(
    () => ({ from: this.weekStart(), to: this.weekEnd(), weekStartsOn: this.weeks.weekStartsOn() }),
    async ({ from, to }) => {
      const history = baselineRange(from);
      const [breakdown, days] = await Promise.all([
        sumByCategory(this.db, from, to),
        sumByDay(this.db, history.from, history.to),
      ]);
      return { breakdown, days };
    },
  );

  /**
   * True once the week on screen — not the one before it — has been read. The
   * empty state waits for this, so a week with expenses never flashes empty.
   */
  protected readonly loaded = computed(() => {
    const params = this.figures()?.params;
    return params?.from === this.weekStart() && params.weekStartsOn === this.weeks.weekStartsOn();
  });

  private readonly rows = computed(() => (this.loaded() ? (this.figures()?.value.breakdown ?? []) : []));

  /**
   * Summed from the breakdown rather than read separately, which makes "the
   * breakdown sums to the total" true by construction.
   */
  protected readonly totalMinor = computed(() =>
    this.rows().reduce((sum, row) => sum + row.totalMinor, 0),
  );

  /**
   * Each category against the largest in the week, not against the total, so
   * the longest measure always spans the full width. The figures carry the
   * absolute truth; the measures carry the ranking.
   */
  protected readonly breakdown = computed(() => {
    const rows = this.rows();
    const largest = rows[0]?.totalMinor ?? 0;

    return rows.map((row) => ({ ...row, fraction: largest === 0 ? 0 : row.totalMinor / largest }));
  });

  protected readonly empty = computed(() => this.loaded() && this.rows().length === 0);

  /** The typical-week figure, or `null` where history is too thin to offer one. */
  protected readonly baselineMinor = computed(() => {
    if (!this.loaded() || this.rows().length === 0) {
      return null;
    }
    return typicalWeek(this.figures()?.value.days ?? [], this.weekStart(), this.weeks.weekStartsOn());
  });

  protected readonly comparison = computed(() => {
    const baseline = this.baselineMinor();
    if (baseline === null) {
      return null;
    }

    const total = this.totalMinor();
    const result = describeComparison(total, baseline, weekHasEnded(this.weekEnd(), todayISO()));
    const amount = formatMinor(result.amountMinor);

    // Descriptive, never budget language: "typical" is what the user's own
    // weeks have been, not a target they are being held to.
    const sentence =
      result.kind === 'headroom'
        ? `${amount} left to reach a typical week`
        : result.kind === 'below'
          ? `${amount} below a typical week`
          : result.amountMinor === 0
            ? 'Level with a typical week'
            : `${amount} above a typical week`;

    // The week and the baseline on one scale: the measure is the week, the
    // marker is where a typical week falls.
    const scale = Math.max(total, baseline);

    return {
      sentence,
      fraction: scale === 0 ? 0 : total / scale,
      marker: scale === 0 ? 0 : baseline / scale,
    };
  });

  protected goToPreviousWeek(): void {
    this.weeks.anchorDate.update((date) => addWeeks(date, -1));
  }

  protected goToNextWeek(): void {
    this.weeks.anchorDate.update((date) => addWeeks(date, 1));
  }

  protected goToCurrentWeek(): void {
    this.weeks.anchorDate.set(todayISO());
  }
}
