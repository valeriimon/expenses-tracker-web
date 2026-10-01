import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward } from 'ionicons/icons';

import {
  formatWeekRange,
  isSameWeek,
  todayISO,
  type IsoDate,
  type WeekStartDay,
} from '../core/lib/dates';

/**
 * Which week is on screen, and the controls for moving between weeks.
 *
 * The shortcut back to the current week is only *offered* when the user is
 * somewhere else — as a live control it would read as an action even when it
 * would do nothing. Its row, however, is always there.
 *
 * That distinction is the point: rendering the row conditionally would move
 * everything below it down by its height the moment the user left the current
 * week, and back up on return, so the page would jump on every navigation.
 * Keeping the row and hiding only its contents costs one row of height on the
 * current week and buys a page that holds still.
 */
@Component({
  selector: 'app-week-header',
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar">
      <button type="button" class="plain icon-button" aria-label="Previous week" (click)="previous.emit()">
        <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
      </button>

      <span class="range t-body t-strong" aria-live="polite">{{ range() }}</span>

      <button type="button" class="plain icon-button" aria-label="Next week" (click)="next.emit()">
        <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
      </button>
    </div>

    <!-- \`visibility: hidden\` takes it out of the tab order and away from
         assistive technology while its box stays: invisible but reachable
         would be worse than absent. -->
    <button
      type="button"
      class="plain current t-caption"
      [class.hidden]="showingCurrentWeek()"
      (click)="current.emit()"
    >
      Back to this week
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-xs) var(--space-sm);
      background: var(--ledger-surface);
      border: 1px solid var(--ledger-rule);
      border-radius: var(--radius-md);
    }

    .range {
      flex: 1;
      text-align: center;
    }

    .current {
      align-self: center;
      padding: var(--space-xs) var(--space-sm);
      color: var(--ledger-accent);
    }

    .current.hidden {
      visibility: hidden;
    }
  `,
})
export class WeekHeaderComponent {
  readonly weekStart = input.required<IsoDate>();
  readonly weekEnd = input.required<IsoDate>();
  readonly weekStartsOn = input.required<WeekStartDay>();

  readonly previous = output<void>();
  readonly next = output<void>();
  readonly current = output<void>();

  protected readonly range = computed(() => formatWeekRange(this.weekStart(), this.weekEnd()));

  protected readonly showingCurrentWeek = computed(() =>
    isSameWeek(this.weekStart(), todayISO(), this.weekStartsOn()),
  );

  constructor() {
    addIcons({ chevronBack, chevronForward });
  }
}
