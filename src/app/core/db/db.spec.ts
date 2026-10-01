// The repositories against a real IndexedDB implementation.
//
// IndexedDB enforces almost nothing by itself, so what is being checked here is
// that the rules SQLite's schema used to hold — a case-only duplicate refused,
// a failed delete taking its reassignment down with it, an import that writes
// everything or nothing — still hold now that they live in these modules.
import 'fake-indexeddb/auto';

import { buildImportPlan, EMPTY_MAPPING, type ImportPlan } from '../lib/import';

import { AppDb, SEED_CATEGORIES } from './app-db';
import { countExpenses, create, listAll, removeAndReassign, rename } from './categories';
import {
  create as createExpense,
  getById,
  listWeek,
  remove as removeExpense,
  sumByCategory,
  sumByDay,
  update as updateExpense,
} from './expenses';
import { importPlan, listExistingKeys } from './import';
import { getWeekStartsOn, setWeekStartsOn } from './settings';

let counter = 0;

async function makeDb(): Promise<AppDb> {
  counter += 1;
  const db = new AppDb(`test-${counter}`);
  await db.open();
  return db;
}

async function addExpense(
  db: AppDb,
  id: string,
  categoryId: string,
  day = '2026-08-25',
  amountMinor = 12300,
  createdAt = '2026-08-25T10:00:00.000Z',
) {
  await db.expenses.add({
    id,
    occurredOn: day,
    description: `expense ${id}`,
    amountMinor,
    categoryId,
    createdAt,
    updatedAt: createdAt,
  });
}

describe('database creation', () => {
  it('seeds the built-in categories once, in order', async () => {
    const db = await makeDb();

    const categories = await listAll(db);
    expect(categories.map((c) => c.name)).toEqual(SEED_CATEGORIES.map((c) => c.name));
    expect(categories.every((c) => c.isBuiltin)).toBe(true);
  });

  it('does not seed again when reopened', async () => {
    const db = await makeDb();
    await create(db, 'Coffee');
    db.close();

    const reopened = new AppDb(db.name);
    await reopened.open();

    expect(await listAll(reopened)).toHaveLength(SEED_CATEGORIES.length + 1);
  });
});

describe('category queries', () => {
  it('appends a created category after the seeded ones', async () => {
    const db = await makeDb();
    const id = await create(db, 'Coffee');

    const categories = await listAll(db);
    expect(categories).toHaveLength(SEED_CATEGORIES.length + 1);
    expect(categories.at(-1)).toEqual({ id, name: 'Coffee', isBuiltin: false });
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('rejects a duplicate differing only in case or whitespace', async () => {
    const db = await makeDb();
    await create(db, 'Coffee');
    await create(db, 'Кава');

    await expect(create(db, 'coffee')).rejects.toThrow();
    await expect(create(db, ' Coffee ')).rejects.toThrow();
    await expect(create(db, 'Sport')).rejects.toThrow();
    // The SQLite index folded ASCII only; this one folds Cyrillic too.
    await expect(create(db, 'КАВА')).rejects.toThrow();

    expect(await listAll(db)).toHaveLength(SEED_CATEGORIES.length + 2);
  });

  it('rejects an empty name', async () => {
    const db = await makeDb();

    await expect(create(db, '   ')).rejects.toThrow();
  });

  it('renames a created category without moving or re-identifying it', async () => {
    const db = await makeDb();
    const id = await create(db, 'Coffee');
    await addExpense(db, 'e1', id);

    await rename(db, id, 'Cafe');

    expect((await listAll(db)).at(-1)).toEqual({ id, name: 'Cafe', isBuiltin: false });
    expect(await countExpenses(db, id)).toBe(1);
    // The old name is free again, the new one is taken.
    await expect(create(db, 'cafe')).rejects.toThrow();
    await expect(create(db, 'Coffee')).resolves.toBeDefined();
  });

  it('refuses to rename a built-in category', async () => {
    const db = await makeDb();

    await rename(db, 'groceries', 'Food');

    expect((await listAll(db))[0].name).toBe('Groceries');
  });

  it('counts the expenses filed under a category', async () => {
    const db = await makeDb();
    await addExpense(db, 'e1', 'groceries');
    await addExpense(db, 'e2', 'groceries');

    expect(await countExpenses(db, 'groceries')).toBe(2);
    expect(await countExpenses(db, 'pets')).toBe(0);
  });

  it('moves expenses to the replacement and deletes the category', async () => {
    const db = await makeDb();
    const coffee = await create(db, 'Coffee');
    await addExpense(db, 'e1', coffee);
    await addExpense(db, 'e2', coffee);
    await addExpense(db, 'e3', 'pets');

    await removeAndReassign(db, coffee, 'other');

    expect((await listAll(db)).some((c) => c.id === coffee)).toBe(false);
    expect(await countExpenses(db, 'other')).toBe(2);
    expect(await countExpenses(db, 'pets')).toBe(1);

    const moved = await db.expenses.get('e1');
    expect(moved).toMatchObject({
      occurredOn: '2026-08-25',
      description: 'expense e1',
      amountMinor: 12300,
      categoryId: 'other',
      createdAt: '2026-08-25T10:00:00.000Z',
    });
    expect(moved?.updatedAt).not.toBe('2026-08-25T10:00:00.000Z');

    expect((await db.expenses.get('e3'))?.updatedAt).toBe('2026-08-25T10:00:00.000Z');
  });

  it('deletes an unused category without needing a replacement', async () => {
    const db = await makeDb();
    const coffee = await create(db, 'Coffee');

    await removeAndReassign(db, coffee, coffee);

    expect((await listAll(db)).some((c) => c.id === coffee)).toBe(false);
  });

  it('refuses to delete a built-in category and leaves its expenses in place', async () => {
    const db = await makeDb();
    await addExpense(db, 'e1', 'groceries');

    await expect(removeAndReassign(db, 'groceries', 'other')).rejects.toThrow();

    expect((await listAll(db)).some((c) => c.id === 'groceries')).toBe(true);
    expect(await countExpenses(db, 'groceries')).toBe(1);
    expect(await countExpenses(db, 'other')).toBe(0);
  });

  it('changes nothing when the replacement does not exist', async () => {
    const db = await makeDb();
    const coffee = await create(db, 'Coffee');
    await addExpense(db, 'e1', coffee);

    await expect(removeAndReassign(db, coffee, 'nope')).rejects.toThrow();

    expect((await listAll(db)).some((c) => c.id === coffee)).toBe(true);
    expect(await countExpenses(db, coffee)).toBe(1);
  });
});

describe('expense queries', () => {
  const input = {
    occurredOn: '2026-08-25',
    description: 'Bread',
    amountMinor: 4550,
    categoryId: 'groceries',
  };

  it('creates, reads, updates and removes an expense', async () => {
    const db = await makeDb();
    await createExpense(db, input);

    const [created] = await listWeek(db, '2026-08-24', '2026-08-30');
    expect(created).toMatchObject({ ...input, categoryName: 'Groceries' });

    await updateExpense(db, created.id, { ...input, occurredOn: '2026-09-01', categoryId: 'pets' });

    expect(await listWeek(db, '2026-08-24', '2026-08-30')).toEqual([]);
    expect(await getById(db, created.id)).toMatchObject({
      occurredOn: '2026-09-01',
      categoryName: 'Pets',
    });

    await removeExpense(db, created.id);
    expect(await getById(db, created.id)).toBeNull();
  });

  it('refuses the rows the form refuses', async () => {
    const db = await makeDb();

    await expect(createExpense(db, { ...input, description: '  ' })).rejects.toThrow();
    await expect(createExpense(db, { ...input, amountMinor: 0 })).rejects.toThrow();
    await expect(createExpense(db, { ...input, amountMinor: -5 })).rejects.toThrow();
    await expect(createExpense(db, { ...input, amountMinor: 1.5 })).rejects.toThrow();
    await expect(createExpense(db, { ...input, categoryId: 'nope' })).rejects.toThrow();
    await expect(createExpense(db, { ...input, occurredOn: '25.08.2026' })).rejects.toThrow();

    expect(await db.expenses.count()).toBe(0);
  });

  it('lists a week most recent day first, most recently created first within a day', async () => {
    const db = await makeDb();
    await addExpense(db, 'before', 'groceries', '2026-08-23');
    await addExpense(db, 'mon-early', 'groceries', '2026-08-24', 100, '2026-08-24T08:00:00.000Z');
    await addExpense(db, 'mon-late', 'groceries', '2026-08-24', 100, '2026-08-24T19:00:00.000Z');
    await addExpense(db, 'sun', 'groceries', '2026-08-30');
    await addExpense(db, 'after', 'groceries', '2026-08-31');

    const week = await listWeek(db, '2026-08-24', '2026-08-30');

    // Both ends of the range are inclusive; the days either side are not.
    expect(week.map((expense) => expense.id)).toEqual(['sun', 'mon-late', 'mon-early']);
  });

  it('sums by category, largest first, name breaking ties, zero categories absent', async () => {
    const db = await makeDb();
    const coffee = await create(db, 'Coffee');
    await addExpense(db, 'a', 'pets', '2026-08-24', 500);
    await addExpense(db, 'b', 'groceries', '2026-08-24', 300);
    await addExpense(db, 'c', 'groceries', '2026-08-30', 700);
    await addExpense(db, 'd', coffee, '2026-08-26', 500);
    await addExpense(db, 'outside', 'sport', '2026-08-31', 9999);

    expect(await sumByCategory(db, '2026-08-24', '2026-08-30')).toEqual([
      { categoryId: 'groceries', categoryName: 'Groceries', totalMinor: 1000 },
      { categoryId: coffee, categoryName: 'Coffee', totalMinor: 500 },
      { categoryId: 'pets', categoryName: 'Pets', totalMinor: 500 },
    ]);
  });

  it('sums by day over an inclusive range', async () => {
    const db = await makeDb();
    await addExpense(db, 'a', 'pets', '2026-08-24', 500);
    await addExpense(db, 'b', 'groceries', '2026-08-24', 300);
    await addExpense(db, 'c', 'groceries', '2026-08-30', 700);
    await addExpense(db, 'before', 'sport', '2026-08-23', 9999);
    await addExpense(db, 'after', 'sport', '2026-08-31', 9999);

    expect(await sumByDay(db, '2026-08-24', '2026-08-30')).toEqual([
      { date: '2026-08-24', totalMinor: 800 },
      { date: '2026-08-30', totalMinor: 700 },
    ]);
  });
});

describe('settings', () => {
  it('defaults the week start to Monday and persists a change', async () => {
    const db = await makeDb();
    expect(await getWeekStartsOn(db)).toBe(1);

    await setWeekStartsOn(db, 0);
    expect(await getWeekStartsOn(db)).toBe(0);
  });

  it('treats a stored value that is not a weekday as absent', async () => {
    const db = await makeDb();
    await db.settings.put({ key: 'week_starts_on', value: '9' });

    expect(await getWeekStartsOn(db)).toBe(1);
  });
});

describe('import', () => {
  const header = ['Date', 'What', 'Amount', 'Category'];
  const mapping = { ...EMPTY_MAPPING, date: 0, description: 1, amount: 2, category: 3 };

  async function plan(db: AppDb, lines: string[][]): Promise<ImportPlan> {
    return buildImportPlan({
      rows: lines.map((fields, index) => ({ lineNumber: index + 2, fields })),
      headerLength: header.length,
      mapping,
      dateFormat: 'YYYY-MM-DD',
      year: 2026,
      existingCategories: await listAll(db),
      existingKeys: await listExistingKeys(db),
    });
  }

  const FILE = [
    ['2026-08-24', 'Bread', '45,50', 'groceries'],
    ['2026-08-24', 'Latte', '95', 'Coffee'],
    ['2026-08-24', 'Flat white', '90', ' coffee '],
    ['2026-08-25', 'Bus', '20', ''],
  ];

  it('creates the categories it needs and files every row', async () => {
    const db = await makeDb();

    const result = await importPlan(db, await plan(db, FILE));

    expect(result).toEqual({ imported: 4, skippedDuplicates: 0, createdCategories: ['Coffee'] });

    const week = await listWeek(db, '2026-08-24', '2026-08-30');
    expect(week.map((e) => [e.description, e.categoryName, e.amountMinor])).toEqual([
      ['Bus', 'Other', 2000],
      // Within a day, in the order the file listed them.
      ['Bread', 'Groceries', 4550],
      ['Latte', 'Coffee', 9500],
      ['Flat white', 'Coffee', 9000],
    ]);
    expect((await listAll(db)).at(-1)).toMatchObject({ name: 'Coffee', isBuiltin: false });
  });

  it('writes nothing the second time the same file is imported', async () => {
    const db = await makeDb();
    await importPlan(db, await plan(db, FILE));

    const result = await importPlan(db, await plan(db, FILE));

    expect(result).toEqual({ imported: 0, skippedDuplicates: 4, createdCategories: [] });
    expect(await db.expenses.count()).toBe(4);
    expect(await listAll(db)).toHaveLength(SEED_CATEGORIES.length + 1);
  });

  it('refuses a plan that has errors', async () => {
    const db = await makeDb();
    const broken = await plan(db, [...FILE, ['not a date', 'x', '1', '']]);

    await expect(importPlan(db, broken)).rejects.toThrow();
    expect(await db.expenses.count()).toBe(0);
  });

  it('rolls back the categories it created when an expense cannot be written', async () => {
    const db = await makeDb();
    const good = await plan(db, FILE);
    // A row no plan would produce, standing in for any failure mid-commit.
    const failing: ImportPlan = {
      ...good,
      rows: [...good.rows, { ...good.rows[0], categoryKey: 'no such category' }],
    };

    await expect(importPlan(db, failing)).rejects.toThrow();

    expect(await db.expenses.count()).toBe(0);
    expect(await listAll(db)).toHaveLength(SEED_CATEGORIES.length);
  });
});
