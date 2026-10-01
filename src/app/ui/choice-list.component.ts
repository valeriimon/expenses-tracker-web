import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark } from 'ionicons/icons';

export type Choice = {
  key: string;
  label: string;
  /** Secondary line, for an example value or what a column contains. */
  hint?: string;
  selected?: boolean;
};

/**
 * A bordered list of options, one of which may be marked as chosen.
 *
 * Every option stays on screen, so choosing is a single press — a dropdown
 * would put the decision behind an extra interaction and hide the alternatives
 * while it was being made.
 */
@Component({
  selector: 'app-choice-list',
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="list" role="radiogroup" [attr.aria-label]="label()">
      @for (option of options(); track option.key) {
        <button
          type="button"
          class="plain list-row"
          role="radio"
          [attr.aria-checked]="option.selected === true"
          (click)="choose.emit(option.key)"
        >
          <span class="grow stack-sm">
            <span class="t-body">{{ option.label }}</span>
            @if (option.hint !== undefined) {
              <span class="t-caption muted">{{ option.hint }}</span>
            }
          </span>
          @if (option.selected === true) {
            <ion-icon name="checkmark" class="check" aria-hidden="true"></ion-icon>
          }
        </button>
      }
    </div>
  `,
  styles: `
    .check {
      flex: none;
      font-size: 1.25rem;
      color: var(--ledger-accent);
    }
  `,
})
export class ChoiceListComponent {
  readonly options = input.required<Choice[]>();
  /** What is being chosen, for assistive technology. */
  readonly label = input.required<string>();

  readonly choose = output<string>();

  constructor() {
    addIcons({ checkmark });
  }
}
