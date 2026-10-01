import { foldCategoryName } from '../lib/categories';
import {
  expenseKey,
  FALLBACK_CATEGORY_ID,
  type ImportPlan,
  type PlannedRow,
} from '../lib/import';

import { newId, type AppDb } from './app-db';
import { create as createCategory, listAll } from './categories';
import { assertValidExpense } from './expenses';

/** What an import did, for the result screen to report. */
export type ImportResult = {
  imported: number;
  skippedDuplicates: number;
  /** Names of the categories the import created, in the order it created them. */
  createdCategories: string[];
};

/**
 * The identity of every expense already recorded, as the keys a duplicate is
 * judged by.
 *
 * Loaded once, before the plan is built, and never refreshed during an import.
 * That snapshot is what lets two identical rows in one file both import while a
 * second import of the same file adds nothing — see the reasoning in
 * `buildImportPlan`.
 */
export async function listExistingKeys(db: AppDb): Promise<Set<string>> {
  const keys = new Set<string>();

  await db.expenses.each((record) => {
    keys.add(expenseKey(record.occurredOn, record.description, record.amountMinor));
  });

  return keys;
}

function resolveCategoryId(row: PlannedRow, idsByFoldedName: Map<string, string>): string {
  if (row.categoryKey === null) {
    return FALLBACK_CATEGORY_ID;
  }

  const id = idsByFoldedName.get(row.categoryKey);

  if (id === undefined) {
    // Unreachable through the wizard — the plan collects every unmatched value
    // as a category to create. Throwing rather than falling back to `Other`
    // keeps a bug from quietly filing someone's expenses in the wrong place:
    // this aborts the transaction and nothing is written at all.
    throw new Error(`No category for "${row.categoryKey}"`);
  }

  return id;
}

/**
 * Writes an import: the categories it needs, then its expenses, in one
 * transaction.
 *
 * The single transaction is what makes the operation all-or-nothing at the
 * storage layer rather than by cleanup code. A throw anywhere inside rolls back
 * both the categories and the expenses.
 *
 * `createdAt` and `updatedAt` are the moment of the import, not the day the
 * expense occurred: the expense happened months ago, but the app learned of it
 * now. The log orders within a day by `createdAt`, most recent first, so each
 * row is stamped a millisecond earlier than the one before it — which is what
 * makes imported rows for one day appear in the order the file listed them.
 */
export async function importPlan(db: AppDb, plan: ImportPlan): Promise<ImportResult> {
  if (plan.errors.length > 0) {
    throw new Error('Refusing to import a plan that has errors');
  }

  const now = Date.now();
  const createdCategories: string[] = [];

  await db.transaction('rw', db.expenses, db.categories, async () => {
    const idsByFoldedName = new Map(
      (await listAll(db)).map((category) => [foldCategoryName(category.name), category.id]),
    );

    for (const name of plan.newCategoryNames) {
      const id = await createCategory(db, name);
      idsByFoldedName.set(foldCategoryName(name), id);
      createdCategories.push(name.trim());
    }

    const records = [];

    for (const [index, row] of plan.rows.entries()) {
      const input = {
        occurredOn: row.occurredOn,
        description: row.description,
        amountMinor: row.amountMinor,
        categoryId: resolveCategoryId(row, idsByFoldedName),
      };
      await assertValidExpense(db, input);

      const stamp = new Date(now - index).toISOString();
      records.push({ id: newId(), ...input, createdAt: stamp, updatedAt: stamp });
    }

    await db.expenses.bulkAdd(records);
  });

  return {
    imported: plan.rows.length,
    skippedDuplicates: plan.duplicates,
    createdCategories,
  };
}
