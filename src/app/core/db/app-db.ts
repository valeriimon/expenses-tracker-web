import { Injectable } from '@angular/core';
import Dexie, { type Table } from 'dexie';

import { foldCategoryName } from '../lib/categories';
import type { IsoDate } from '../lib/dates';

export const DATABASE_NAME = 'expenses';

/**
 * The stored shapes. Two conventions run through them:
 *
 * - `occurredOn` is a calendar day (`YYYY-MM-DD`), not an instant. An expense
 *   belongs to a day the user picked, which no timezone change may move.
 *   Zero-padded ISO dates also range-compare correctly as plain strings, so the
 *   week query is an ordinary index range.
 * - `amountMinor` is an integer count of kopiykas. Summing is this app's main
 *   job, and floating point drifts under addition.
 */
export type ExpenseRecord = {
  id: string;
  occurredOn: IsoDate;
  description: string;
  amountMinor: number;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryRecord = {
  id: string;
  name: string;
  /**
   * The name as two categories are compared by — see `foldCategoryName`. Its
   * unique index is the storage-level backstop against a case-only duplicate.
   */
  nameFolded: string;
  sortOrder: number;
  /** Seeded and frozen: the user can neither rename nor delete it. */
  isBuiltin: boolean;
};

export type SettingRecord = {
  key: string;
  value: string;
};

/**
 * The starting category list, taken from the taxonomy the reference journal
 * already used over two months of real entries.
 *
 * `other` is what makes a required category tolerable: without it, spending
 * that matches nothing here could not be recorded at all, and the user would
 * have to either abandon the entry or file it somewhere untrue.
 */
export const SEED_CATEGORIES: { id: string; name: string }[] = [
  { id: 'groceries', name: 'Groceries' },
  { id: 'eating-out', name: 'Eating out' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'household', name: 'Household' },
  { id: 'subscriptions', name: 'Subscriptions' },
  { id: 'health-beauty', name: 'Health & beauty' },
  { id: 'pets', name: 'Pets' },
  { id: 'sport', name: 'Sport' },
  { id: 'transfers-debts', name: 'Transfers & debts' },
  { id: 'sweets', name: 'Sweets' },
  { id: 'bad-habits', name: 'Bad habits' },
  { id: 'connectivity', name: 'Connectivity' },
  { id: 'other', name: 'Other' },
];

/** A random identifier in the form the mobile app's SQLite produced. */
export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * The browser's own database, in IndexedDB.
 *
 * IndexedDB has no `CHECK` and no foreign keys, so the rules the mobile app's
 * SQLite schema enforced are restated in the modules that write: nothing but
 * those modules should call `put` or `add` on these tables.
 */
@Injectable({ providedIn: 'root', useFactory: () => new AppDb() })
export class AppDb extends Dexie {
  expenses!: Table<ExpenseRecord, string>;
  categories!: Table<CategoryRecord, string>;
  settings!: Table<SettingRecord, string>;

  constructor(name: string = DATABASE_NAME) {
    super(name);

    this.version(1).stores({
      expenses: 'id, occurredOn, categoryId',
      categories: 'id, &nameFolded, sortOrder',
      settings: 'key',
    });

    // Runs once, inside the transaction that creates the database, so no
    // reader can ever see the tables without the built-in categories.
    this.on('populate', (transaction) => {
      transaction.table<CategoryRecord, string>('categories').bulkAdd(
        SEED_CATEGORIES.map((category, index) => ({
          id: category.id,
          name: category.name,
          nameFolded: foldCategoryName(category.name),
          sortOrder: index,
          isBuiltin: true,
        })),
      );
    });
  }
}
