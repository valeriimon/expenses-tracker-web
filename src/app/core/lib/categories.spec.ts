import { customCount, customFirst, validateCategoryName } from './categories';

const existing = [
  { id: 'groceries', name: 'Groceries' },
  { id: 'other', name: 'Other' },
  { id: 'custom-1', name: 'Coffee' },
  { id: 'custom-2', name: 'Кава' },
];

describe('validateCategoryName', () => {
  it('accepts a name nothing else uses', () => {
    expect(validateCategoryName('Books', existing)).toEqual({ ok: true, name: 'Books' });
  });

  it('stores the name trimmed', () => {
    expect(validateCategoryName('  Books  ', existing)).toEqual({ ok: true, name: 'Books' });
  });

  it('rejects an empty name', () => {
    expect(validateCategoryName('', existing)).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects a name that is only whitespace', () => {
    expect(validateCategoryName('   ', existing)).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects an exact duplicate', () => {
    expect(validateCategoryName('Coffee', existing)).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('rejects a duplicate differing only in case', () => {
    expect(validateCategoryName('coffee', existing)).toEqual({ ok: false, reason: 'duplicate' });
    expect(validateCategoryName('COFFEE', existing)).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('rejects a duplicate differing only in surrounding whitespace', () => {
    expect(validateCategoryName('  Coffee ', existing)).toEqual({
      ok: false,
      reason: 'duplicate',
    });
  });

  // The case the schema's unique index cannot catch on its own: SQLite's
  // `lower()` folds ASCII only.
  it('rejects a Cyrillic duplicate differing only in case', () => {
    expect(validateCategoryName('кава', existing)).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('rejects a name already used by a built-in category', () => {
    expect(validateCategoryName('groceries', existing)).toEqual({
      ok: false,
      reason: 'duplicate',
    });
  });

  it('accepts a rename that leaves the name unchanged', () => {
    expect(validateCategoryName('Coffee', existing, 'custom-1')).toEqual({
      ok: true,
      name: 'Coffee',
    });
  });

  it('accepts a rename that only changes the name case', () => {
    expect(validateCategoryName('COFFEE', existing, 'custom-1')).toEqual({
      ok: true,
      name: 'COFFEE',
    });
  });

  it('still rejects a rename onto another category name', () => {
    expect(validateCategoryName('Other', existing, 'custom-1')).toEqual({
      ok: false,
      reason: 'duplicate',
    });
  });
});

const mixed = [
  { id: 'groceries', name: 'Groceries', isBuiltin: true },
  { id: 'pets', name: 'Pets', isBuiltin: true },
  { id: 'custom-1', name: 'Coffee', isBuiltin: false },
  { id: 'custom-2', name: 'Books', isBuiltin: false },
];

describe('customFirst', () => {
  it('puts the user’s own categories before the built-in ones', () => {
    expect(customFirst(mixed).map((c) => c.id)).toEqual([
      'custom-2',
      'custom-1',
      'groceries',
      'pets',
    ]);
  });

  // `listAll` returns stored order and `sort_order` only grows, so the last
  // custom row is the one added most recently.
  it('leads with the most recently added custom category', () => {
    const withNewer = [...mixed, { id: 'custom-3', name: 'Plants', isBuiltin: false }];
    expect(customFirst(withNewer).map((c) => c.id)).toEqual([
      'custom-3',
      'custom-2',
      'custom-1',
      'groceries',
      'pets',
    ]);
  });

  it('keeps the built-in group in the order it came in', () => {
    const reordered = customFirst([mixed[1], mixed[2], mixed[0]]);
    expect(reordered.map((c) => c.id)).toEqual(['custom-1', 'pets', 'groceries']);
  });

  it('leaves a built-in-only list alone', () => {
    const builtins = mixed.filter((c) => c.isBuiltin);
    expect(customFirst(builtins)).toEqual(builtins);
    expect(customFirst([])).toEqual([]);
  });

  it('does not mutate the list it is given', () => {
    const input = [...mixed];
    customFirst(input);
    expect(input.map((c) => c.id)).toEqual(['groceries', 'pets', 'custom-1', 'custom-2']);
  });
});

describe('customCount', () => {
  it('counts only the user’s own categories', () => {
    expect(customCount(mixed)).toBe(2);
    expect(customCount(mixed.filter((c) => c.isBuiltin))).toBe(0);
    expect(customCount([])).toBe(0);
  });
});
