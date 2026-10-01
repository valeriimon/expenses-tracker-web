import { foldCategoryName } from '../lib/categories';

import { newId, type AppDb, type CategoryRecord } from './app-db';

export type Category = {
  id: string;
  name: string;
  /** Seeded and frozen: the user can neither rename nor delete it. */
  isBuiltin: boolean;
};

function toCategory(record: CategoryRecord): Category {
  return { id: record.id, name: record.name, isBuiltin: record.isBuiltin };
}

/**
 * Every category, in the order the picker should show them.
 *
 * `sortOrder` comes from the seed rather than alphabetical order, so the
 * categories used most often sit near the front instead of scattered. Anything
 * the user creates is appended after them.
 *
 * Built-in and user-created rows come back in one list: everything that reads
 * categories wants both, and only the management screen cares which is which.
 */
export async function listAll(db: AppDb): Promise<Category[]> {
  return (await db.categories.orderBy('sortOrder').toArray()).map(toCategory);
}

/**
 * Adds a category of the user's own and returns its id.
 *
 * The identifier is random rather than derived from the name: deriving it would
 * tie identity to the name and turn a rename into a cascade. A random id keeps
 * rename a plain update, so expenses stay filed under the category through one.
 *
 * `sortOrder` continues past the seeded rows, leaving the seed's
 * most-used-first ordering at the front of the picker.
 *
 * Must be called inside a transaction when the caller has one open — it joins
 * it, which is what lets an import create its categories and its expenses as
 * one operation.
 */
export async function create(db: AppDb, name: string): Promise<string> {
  return db.transaction('rw', db.categories, async () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      throw new Error('A category needs a name');
    }

    const last = await db.categories.orderBy('sortOrder').last();
    const id = newId();

    // The unique index on `nameFolded` is what refuses a duplicate: the add
    // rejects, and the transaction with it.
    await db.categories.add({
      id,
      name: trimmed,
      nameFolded: foldCategoryName(trimmed),
      sortOrder: last === undefined ? 0 : last.sortOrder + 1,
      isBuiltin: false,
    });

    return id;
  });
}

/**
 * Renames a user-created category. The built-in check is what makes the seeded
 * list read-only no matter which caller asks — the management screen offers no
 * rename action for those rows, and this refuses one anyway.
 */
export async function rename(db: AppDb, id: string, name: string): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const existing = await db.categories.get(id);
    const trimmed = name.trim();

    if (existing === undefined || existing.isBuiltin || trimmed === '') {
      return;
    }

    await db.categories.update(id, { name: trimmed, nameFolded: foldCategoryName(trimmed) });
  });
}

/** How many expenses are filed under a category. */
export async function countExpenses(db: AppDb, categoryId: string): Promise<number> {
  return db.expenses.where('categoryId').equals(categoryId).count();
}

/**
 * Deletes a user-created category, moving every expense filed under it to
 * `replacementId` first.
 *
 * Both writes run in one transaction: reassigning without the delete committing
 * would move expenses for nothing, and deleting without the reassignment would
 * leave expenses pointing at a category that no longer exists.
 *
 * A category that is built-in or already gone throws rather than returning
 * quietly, which rolls the reassignment back too — otherwise a caller could
 * move a built-in category's expenses away while the category itself survived.
 *
 * Only `categoryId` and `updatedAt` change on the moved expenses. Their date,
 * description, and amount are untouched, so nothing shifts between day groups
 * and no day or week total moves.
 */
export async function removeAndReassign(
  db: AppDb,
  id: string,
  replacementId: string,
): Promise<void> {
  await db.transaction('rw', db.expenses, db.categories, async () => {
    const filed = db.expenses.where('categoryId').equals(id);

    if ((await filed.count()) > 0) {
      // With nothing filed under it the replacement is never read, which is
      // what lets an unused category be deleted without naming one.
      if (replacementId === id || (await db.categories.get(replacementId)) === undefined) {
        throw new Error(`Category ${replacementId} cannot take the expenses of ${id}`);
      }

      await filed.modify({ categoryId: replacementId, updatedAt: new Date().toISOString() });
    }

    const category = await db.categories.get(id);

    if (category === undefined || category.isBuiltin) {
      throw new Error(`Category ${id} is built-in or no longer exists and was not deleted`);
    }

    await db.categories.delete(id);
  });
}
