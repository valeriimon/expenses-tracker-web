import { Component, computed, inject, signal } from '@angular/core';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  checkmark,
  chevronBack,
  chevronForward,
  close,
  pencil,
  trashOutline,
} from 'ionicons/icons';

import { AppDb } from '../../core/db/app-db';
import {
  countExpenses,
  create,
  listAll,
  removeAndReassign,
  rename,
  type Category,
} from '../../core/db/categories';
import {
  customCount,
  customFirst,
  validateCategoryName,
  type CategoryNameError,
} from '../../core/lib/categories';
import { live } from '../../core/state/live';

/** What the user is told when a name is refused. */
const NAME_ERRORS: Record<CategoryNameError, string> = {
  empty: 'Enter a name.',
  duplicate: 'A category with that name already exists.',
};

/** The category being deleted, with the number of expenses it holds. */
type DeleteTarget = {
  category: Category;
  expenseCount: number;
};

/**
 * Add, rename, and delete the user's own categories.
 *
 * The seeded thirteen are listed but carry no actions: they are what keeps
 * `Other` available as a fallback, so nothing may rename or remove them.
 *
 * Renaming happens in place rather than in a dialog, and deleting a category
 * that holds expenses opens a sheet listing where they can go — a list of
 * destinations does not fit in an alert.
 */
@Component({
  selector: 'app-categories',
  templateUrl: 'categories.page.html',
  styleUrls: ['categories.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonModal,
  ],
})
export class CategoriesPage {
  private readonly db = inject(AppDb);
  private readonly nav = inject(NavController);
  private readonly alerts = inject(AlertController);

  private readonly rows = live(
    () => null,
    () => listAll(this.db),
  );
  protected readonly categories = computed(() => this.rows()?.value ?? []);

  // Managing categories means managing the user's own, so those come first —
  // newest at the top, where the one just added is looked for — and a heavier
  // rule marks where the built-in ones start.
  protected readonly ordered = computed(() => customFirst(this.categories()));
  protected readonly dividerAfter = computed(() => {
    const custom = customCount(this.categories());
    return custom > 0 && custom < this.categories().length ? custom : null;
  });

  protected readonly newName = signal('');
  protected readonly newNameError = signal<string | null>(null);

  protected readonly renamingId = signal<string | null>(null);
  protected readonly renameValue = signal('');
  protected readonly renameError = signal<string | null>(null);

  protected readonly deleteTarget = signal<DeleteTarget | null>(null);

  /** Everywhere the expenses of the category being deleted could go. */
  protected readonly replacements = computed(() => {
    const target = this.deleteTarget();
    return target === null
      ? []
      : this.categories().filter((candidate) => candidate.id !== target.category.id);
  });

  protected readonly deleteExplanation = computed(() => {
    const target = this.deleteTarget();
    if (target === null) {
      return '';
    }
    return target.expenseCount === 1
      ? `1 expense uses ${target.category.name}. Choose where it should go — deleting the category moves it, and nothing is deleted.`
      : `${target.expenseCount} expenses use ${target.category.name}. Choose where they should go — deleting the category moves them, and nothing is deleted.`;
  });

  constructor() {
    addIcons({ add, checkmark, chevronBack, chevronForward, close, pencil, trashOutline });
  }

  protected onNewNameInput(value: string): void {
    this.newName.set(value);
    this.newNameError.set(null);
  }

  protected async createCategory(): Promise<void> {
    const result = validateCategoryName(this.newName(), this.categories());

    if (!result.ok) {
      // Only the message changes: whatever was typed stays for correcting.
      this.newNameError.set(NAME_ERRORS[result.reason]);
      return;
    }

    await create(this.db, result.name);
    this.newName.set('');
    this.newNameError.set(null);
  }

  protected startRename(category: Category): void {
    this.renamingId.set(category.id);
    this.renameValue.set(category.name);
    this.renameError.set(null);
  }

  protected cancelRename(): void {
    this.renamingId.set(null);
    this.renameValue.set('');
    this.renameError.set(null);
  }

  protected onRenameInput(value: string): void {
    this.renameValue.set(value);
    this.renameError.set(null);
  }

  protected async saveRename(): Promise<void> {
    const id = this.renamingId();
    if (id === null) {
      return;
    }

    // The row being renamed is excluded from the duplicate check, so confirming
    // a name unchanged is accepted rather than read as a clash with itself.
    const result = validateCategoryName(this.renameValue(), this.categories(), id);

    if (!result.ok) {
      this.renameError.set(NAME_ERRORS[result.reason]);
      return;
    }

    await rename(this.db, id, result.name);
    this.cancelRename();
  }

  protected async confirmDelete(category: Category): Promise<void> {
    const expenseCount = await countExpenses(this.db, category.id);

    if (expenseCount > 0) {
      this.deleteTarget.set({ category, expenseCount });
      return;
    }

    const alert = await this.alerts.create({
      header: `Delete ${category.name}?`,
      message: 'No expenses use this category.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            // Nothing is filed under it, so the replacement is never read.
            removeAndReassign(this.db, category.id, category.id).catch((error) =>
              this.reportDeleteFailure(error),
            );
          },
        },
      ],
    });
    await alert.present();
  }

  protected async reassignAndDelete(replacementId: string): Promise<void> {
    const target = this.deleteTarget();
    if (target === null) {
      return;
    }

    this.deleteTarget.set(null);

    try {
      await removeAndReassign(this.db, target.category.id, replacementId);
    } catch (error) {
      await this.reportDeleteFailure(error);
    }
  }

  private async reportDeleteFailure(error: unknown): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Could not delete',
      message: String(error),
      buttons: ['OK'],
    });
    await alert.present();
  }

  protected back(): void {
    this.nav.navigateBack('/settings');
  }
}
