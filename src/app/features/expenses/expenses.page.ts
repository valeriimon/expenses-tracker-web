import { Component, computed, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, settingsOutline } from 'ionicons/icons';

import { AppDb } from '../../core/db/app-db';
import { listWeek } from '../../core/db/expenses';
import { formatMinor, formatMinorBare } from '../../core/lib/currency';
import { addWeeks, endOfWeek, startOfWeek, todayISO } from '../../core/lib/dates';
import { live } from '../../core/state/live';
import { WeekStore } from '../../core/state/week-store';
import { BalanceRuleComponent } from '../../ui/balance-rule.component';
import { WeekHeaderComponent } from '../../ui/week-header.component';
import { WeekTransitionComponent } from '../../ui/week-transition.component';

import { groupByDay } from './group-by-day';

/**
 * The weekly log: one week of expenses at a time, grouped by the day they
 * happened, with what each day and the week cost.
 */
@Component({
  selector: 'app-expenses',
  templateUrl: 'expenses.page.html',
  styleUrls: ['expenses.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonFab,
    IonFabButton,
    BalanceRuleComponent,
    WeekHeaderComponent,
    WeekTransitionComponent,
  ],
})
export class ExpensesPage {
  private readonly db = inject(AppDb);
  private readonly nav = inject(NavController);
  protected readonly weeks = inject(WeekStore);

  protected readonly formatMinor = formatMinor;
  protected readonly formatMinorBare = formatMinorBare;

  protected readonly weekStart = computed(() =>
    startOfWeek(this.weeks.anchorDate(), this.weeks.weekStartsOn()),
  );
  protected readonly weekEnd = computed(() =>
    endOfWeek(this.weeks.anchorDate(), this.weeks.weekStartsOn()),
  );

  private readonly week = live(
    () => ({ from: this.weekStart(), to: this.weekEnd() }),
    ({ from, to }) => listWeek(this.db, from, to),
  );

  /**
   * True once the week on screen — not the one before it — has been read. The
   * empty state waits for this, so a week with expenses never flashes empty.
   */
  protected readonly loaded = computed(() => this.week()?.params.from === this.weekStart());

  private readonly grouped = computed(() =>
    groupByDay(this.loaded() ? (this.week()?.value ?? []) : []),
  );
  protected readonly sections = computed(() => this.grouped().sections);
  protected readonly totalMinor = computed(() => this.grouped().totalMinor);

  constructor() {
    addIcons({ add, settingsOutline });
  }

  // Shared by the header's chevrons and the log's swipe, so the two can never
  // drift into meaning different things.
  protected goToPreviousWeek(): void {
    this.weeks.anchorDate.update((date) => addWeeks(date, -1));
  }

  protected goToNextWeek(): void {
    this.weeks.anchorDate.update((date) => addWeeks(date, 1));
  }

  protected goToCurrentWeek(): void {
    this.weeks.anchorDate.set(todayISO());
  }

  protected openExpense(id: string): void {
    this.nav.navigateForward(['/expense', id]);
  }

  protected addExpense(): void {
    this.nav.navigateForward('/expense/new');
  }

  protected openSettings(): void {
    this.nav.navigateForward('/settings');
  }
}
