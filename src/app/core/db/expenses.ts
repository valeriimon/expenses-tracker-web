import type { IsoDate } from '../lib/dates';

import { newId, type AppDb, type ExpenseRecord } from './app-db';

/** An expense as the rest of the app sees it, with its category resolved. */
export type Expense = {
  id: string;
  occurredOn: IsoDate;
  description: string;
  amountMinor: number;
  categoryId: string;
  categoryName: string;
};

/** The fields a user supplies. Identifiers and timestamps are ours to set. */
export type ExpenseInput = {
  occurredOn: IsoDate;
  description: string;
  amountMinor: number;
  categoryId: string;
};

/** What one category cost over a range of days. */
export type CategorySum = {
  categoryId: string;
  categoryName: string;
  totalMinor: number;
};

/** What one day cost. */
export type DaySum = {
  date: IsoDate;
  totalMinor: number;
};

async function categoryNames(db: AppDb): Promise<Map<string, string>> {
  const categories = await db.categories.toArray();
  return new Map(categories.map((category) => [category.id, category.name]));
}

function toExpense(record: ExpenseRecord, names: Map<string, string>): Expense {
  return {
    id: record.id,
    occurredOn: record.occurredOn,
    description: record.description,
    amountMinor: record.amountMinor,
    categoryId: record.categoryId,
    categoryName: names.get(record.categoryId) ?? '',
  };
}

function inRange(db: AppDb, from: IsoDate, to: IsoDate): Promise<ExpenseRecord[]> {
  return db.expenses.where('occurredOn').between(from, to, true, true).toArray();
}

/**
 * The validation the form performs, restated where the write happens. The form
 * validates first, because it can say something useful; this is what guarantees
 * a bad row cannot exist no matter which code path does the writing.
 */
export async function assertValidExpense(db: AppDb, input: ExpenseInput): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) {
    throw new Error(`"${input.occurredOn}" is not a calendar day`);
  }
  if (input.description.trim() === '') {
    throw new Error('An expense needs a description');
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('An expense needs an amount greater than zero');
  }
  if ((await db.categories.get(input.categoryId)) === undefined) {
    throw new Error(`Category ${input.categoryId} does not exist`);
  }
}

/**
 * Every expense in an inclusive range of calendar days, ordered the way the log
 * displays them: most recent day first, and within a day the most recently
 * recorded entry first, so the one being amended is nearest the top.
 *
 * The range compares `occurredOn` as text, which is exactly right for
 * zero-padded ISO dates and lets the read use the `occurredOn` index.
 */
export async function listWeek(db: AppDb, from: IsoDate, to: IsoDate): Promise<Expense[]> {
  return db.transaction('r', db.expenses, db.categories, async () => {
    const [records, names] = await Promise.all([inRange(db, from, to), categoryNames(db)]);

    records.sort(
      (a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt),
    );

    return records.map((record) => toExpense(record, names));
  });
}

export async function getById(db: AppDb, id: string): Promise<Expense | null> {
  return db.transaction('r', db.expenses, db.categories, async () => {
    const record = await db.expenses.get(id);
    return record === undefined ? null : toExpense(record, await categoryNames(db));
  });
}

/** Records a new expense. */
export async function create(db: AppDb, input: ExpenseInput): Promise<void> {
  const now = new Date().toISOString();

  await db.transaction('rw', db.expenses, db.categories, async () => {
    await assertValidExpense(db, input);
    await db.expenses.add({ id: newId(), ...input, createdAt: now, updatedAt: now });
  });
}

/** Replaces every user-supplied field. `createdAt` is deliberately untouched. */
export async function update(db: AppDb, id: string, input: ExpenseInput): Promise<void> {
  await db.transaction('rw', db.expenses, db.categories, async () => {
    await assertValidExpense(db, input);
    await db.expenses.update(id, { ...input, updatedAt: new Date().toISOString() });
  });
}

export async function remove(db: AppDb, id: string): Promise<void> {
  await db.expenses.delete(id);
}

/**
 * What each category cost over an inclusive range of days: one row per category
 * that recorded anything, largest first, name ascending as the tie-break so the
 * order is stable.
 *
 * The week total is summed from these rows rather than read separately, which
 * makes "the breakdown sums to the total" true by construction.
 */
export async function sumByCategory(
  db: AppDb,
  from: IsoDate,
  to: IsoDate,
): Promise<CategorySum[]> {
  return db.transaction('r', db.expenses, db.categories, async () => {
    const [records, names] = await Promise.all([inRange(db, from, to), categoryNames(db)]);
    const totals = new Map<string, number>();

    for (const record of records) {
      totals.set(record.categoryId, (totals.get(record.categoryId) ?? 0) + record.amountMinor);
    }

    return Array.from(totals, ([categoryId, totalMinor]) => ({
      categoryId,
      categoryName: names.get(categoryId) ?? '',
      totalMinor,
    })).sort(
      (a, b) => b.totalMinor - a.totalMinor || a.categoryName.localeCompare(b.categoryName),
    );
  });
}

/** One row per day that has expenses in an inclusive range, earliest first. */
export async function sumByDay(db: AppDb, from: IsoDate, to: IsoDate): Promise<DaySum[]> {
  const totals = new Map<IsoDate, number>();

  for (const record of await inRange(db, from, to)) {
    totals.set(record.occurredOn, (totals.get(record.occurredOn) ?? 0) + record.amountMinor);
  }

  return Array.from(totals, ([date, totalMinor]) => ({ date, totalMinor })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
