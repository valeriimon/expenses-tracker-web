import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonInput,
  IonModal,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';

import { AppDb } from '../../core/db/app-db';
import { listAll } from '../../core/db/categories';
import { create, getById, remove, update } from '../../core/db/expenses';
import { parseAmount, toAmountInput } from '../../core/lib/currency';
import { formatFullDate, todayISO, type IsoDate } from '../../core/lib/dates';
import { live } from '../../core/state/live';
import { WeekStore } from '../../core/state/week-store';

import { CategoryPickerComponent } from './category-picker.component';

type FieldErrors = {
  description?: string;
  amount?: string;
  category?: string;
};

/**
 * Records a new expense or amends an existing one.
 *
 * One page for both, because the spec asks for identical fields and identical
 * validation either way — the only differences are where the initial values
 * come from and which write runs on save.
 */
@Component({
  selector: 'app-expense-form',
  templateUrl: 'expense-form.page.html',
  styleUrls: ['expense-form.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonInput,
    IonModal,
    IonDatetime,
    CategoryPickerComponent,
  ],
})
export class ExpenseFormPage {
  private readonly db = inject(AppDb);
  private readonly nav = inject(NavController);
  private readonly alerts = inject(AlertController);
  protected readonly weeks = inject(WeekStore);

  /** The route's `:id`. Absent when recording a new expense. */
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? undefined;

  protected readonly isEditing = this.id !== undefined;

  // The prefill the spec asks for: a new expense is dated today until the user
  // says otherwise.
  protected readonly date = signal<IsoDate>(todayISO());
  protected readonly description = signal('');
  protected readonly amount = signal('');
  protected readonly categoryId = signal<string | null>(null);

  protected readonly errors = signal<FieldErrors>({});
  protected readonly pickerOpen = signal(false);
  protected readonly loaded = signal(false);
  protected readonly saving = signal(false);

  protected readonly dateLabel = computed(() => formatFullDate(this.date()));

  private readonly categoryRows = live(
    () => null,
    () => listAll(this.db),
  );
  protected readonly categories = computed(() => this.categoryRows()?.value ?? []);

  constructor() {
    const id = this.id;

    if (id === undefined) {
      this.loaded.set(true);
      return;
    }

    getById(this.db, id).then((expense) => {
      if (expense === null) {
        // Deleted from elsewhere while this form was opening.
        this.close();
        return;
      }
      this.date.set(expense.occurredOn);
      this.description.set(expense.description);
      this.amount.set(toAmountInput(expense.amountMinor));
      this.categoryId.set(expense.categoryId);
      this.loaded.set(true);
    });
  }

  protected onDateChange(value: string | string[] | null | undefined): void {
    if (typeof value === 'string') {
      // The picker may hand back a full timestamp; the calendar day is the
      // first ten characters either way, with no timezone arithmetic involved.
      this.date.set(value.slice(0, 10));
    }
    this.pickerOpen.set(false);
  }

  protected async save(): Promise<void> {
    const description = this.description().trim();
    const parsedAmount = parseAmount(this.amount());
    const categoryId = this.categoryId();

    const errors: FieldErrors = {};

    if (description === '') {
      errors.description = 'Enter what you bought.';
    }

    if (!parsedAmount.ok) {
      errors.amount =
        parsedAmount.reason === 'empty'
          ? 'Enter an amount.'
          : parsedAmount.reason === 'not-positive'
            ? 'Amount must be more than zero.'
            : 'Enter a valid amount, for example 250 or 250,50.';
    }

    if (categoryId === null) {
      errors.category = 'Choose a category.';
    }

    // Only the messages change here: every field keeps whatever was typed.
    this.errors.set(errors);

    if (!parsedAmount.ok || categoryId === null || description === '') {
      return;
    }

    this.saving.set(true);

    const expense = {
      occurredOn: this.date(),
      description,
      amountMinor: parsedAmount.minor,
      categoryId,
    };

    try {
      const id = this.id;
      if (id === undefined) {
        await create(this.db, expense);
      } else {
        await update(this.db, id, expense);
      }
    } catch (error) {
      this.saving.set(false);
      const alert = await this.alerts.create({
        header: 'Could not save',
        message: String(error),
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Take the log to the week the expense landed in. Staying put would let an
    // entry dated outside the viewed week vanish the moment it is saved.
    this.weeks.anchorDate.set(expense.occurredOn);
    this.close();
  }

  protected async confirmDelete(): Promise<void> {
    const id = this.id;
    if (id === undefined) {
      return;
    }

    const alert = await this.alerts.create({
      header: 'Delete this expense?',
      message: 'This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            remove(this.db, id).then(() => this.close());
          },
        },
      ],
    });
    await alert.present();
  }

  protected close(): void {
    this.nav.navigateBack('/tabs/expenses');
  }
}
