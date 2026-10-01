import { Component, computed, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForward, close } from 'ionicons/icons';

import { WEEKDAY_NAMES, type WeekStartDay } from '../../core/lib/dates';
import { WeekStore } from '../../core/state/week-store';
import { ChoiceListComponent, type Choice } from '../../ui/choice-list.component';

const WEEK_START_DAYS: WeekStartDay[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * Settings, presented over the tabs rather than as a destination of its own —
 * the shell specifies which top-level destinations exist, and settings is not
 * one of them.
 */
@Component({
  selector: 'app-settings',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    ChoiceListComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Close settings" (click)="close()">
            <ion-icon slot="icon-only" name="close" aria-hidden="true"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page">
        <section class="stack-sm">
          <h2 class="t-caption muted label">Week starts on</h2>
          <p class="t-caption muted">
            Sets the boundaries of every week in the log. Changing it regroups your expenses
            without altering any of their dates.
          </p>
          <app-choice-list
            class="options"
            label="Week starts on"
            [options]="weekStartOptions()"
            (choose)="changeWeekStart($event)"
          />
        </section>

        <section class="stack-sm later">
          <h2 class="t-caption muted label">Categories</h2>
          <p class="t-caption muted">
            Add categories of your own alongside the built-in ones, or rename and remove the ones
            you added.
          </p>
          <div class="list options">
            <button type="button" class="plain list-row" (click)="manageCategories()">
              <span class="grow t-body">Manage categories</span>
              <ion-icon name="chevron-forward" class="muted" aria-hidden="true"></ion-icon>
            </button>
          </div>
        </section>

        <section class="stack-sm later">
          <h2 class="t-caption muted label">Where your data lives</h2>
          <p class="t-caption muted">
            Everything you record is stored in this browser, on this device. Nothing is sent
            anywhere, and nothing is shared with other browsers or devices. Clearing this site's
            data in the browser deletes your expenses.
          </p>
        </section>
      </div>
    </ion-content>
  `,
  styles: `
    .label {
      margin: 0;
    }

    .options {
      display: block;
      margin-top: var(--space-sm);
    }

    .later {
      margin-top: var(--space-xl);
    }
  `,
})
export class SettingsPage {
  private readonly nav = inject(NavController);
  private readonly weeks = inject(WeekStore);

  protected readonly weekStartOptions = computed<Choice[]>(() =>
    WEEK_START_DAYS.map((day) => ({
      key: String(day),
      label: WEEKDAY_NAMES[day],
      selected: day === this.weeks.weekStartsOn(),
    })),
  );

  constructor() {
    addIcons({ chevronForward, close });
  }

  protected changeWeekStart(key: string): void {
    this.weeks.changeWeekStartsOn(Number(key) as WeekStartDay);
  }

  protected manageCategories(): void {
    this.nav.navigateForward('/settings/categories');
  }

  protected close(): void {
    this.nav.navigateBack('/tabs/expenses');
  }
}
