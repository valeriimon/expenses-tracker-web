import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { Category } from '../../core/db/categories';
import { customCount, customFirst } from '../../core/lib/categories';

/**
 * Categories as a wrapping row of chips. Every option stays on screen, so
 * choosing one is a single press — a picker or dropdown would put a required
 * field behind an extra interaction on every entry.
 *
 * The user's own categories come first, most recently added at the very front:
 * someone who added one did it because they expect to use it, and it would
 * otherwise sit below thirteen seeded chips. A rule separates the two groups,
 * since the chips carry no other mark of which is which.
 */
@Component({
  selector: 'app-category-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chips" role="radiogroup" aria-label="Category">
      @for (category of ordered(); track category.id; let index = $index) {
        <button
          type="button"
          class="chip t-caption"
          role="radio"
          [class.selected]="category.id === selectedId()"
          [attr.aria-checked]="category.id === selectedId()"
          (click)="choose.emit(category.id)"
        >
          {{ category.name }}
        </button>

        <!-- Full width, so it takes a line of its own and pushes the built-in
             chips onto the next one. -->
        @if (index + 1 === dividerAfter()) {
          <div class="divider" aria-hidden="true"></div>
        }
      }
    </div>
  `,
  styles: `
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .chip {
      appearance: none;
      font-family: inherit;
      cursor: pointer;
      padding: var(--space-sm) var(--space-md);
      border: 1px solid var(--ledger-rule);
      border-radius: var(--radius-pill);
      background: var(--ledger-surface);
      color: var(--ledger-text);
    }

    .chip.selected {
      border-color: var(--ledger-accent);
      background: var(--ledger-accent);
      color: var(--ledger-on-accent);
    }

    .divider {
      width: 100%;
      height: 1px;
      background: var(--ledger-rule);
    }
  `,
})
export class CategoryPickerComponent {
  readonly categories = input.required<Category[]>();
  readonly selectedId = input.required<string | null>();

  readonly choose = output<string>();

  protected readonly ordered = computed(() => customFirst(this.categories()));

  // Only when both groups are on screen. With no custom categories the rule
  // would sit above the whole list; with nothing but custom ones, below it.
  protected readonly dividerAfter = computed(() => {
    const custom = customCount(this.categories());
    return custom > 0 && custom < this.categories().length ? custom : null;
  });
}
