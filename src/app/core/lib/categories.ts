/** Why a category name was rejected, mapped to a message by the screen. */
export type CategoryNameError = 'empty' | 'duplicate';

export type CategoryNameResult =
  | { ok: true; name: string }
  | { ok: false; reason: CategoryNameError };

/** The shape this helper needs from a category — anything with an id and a name. */
export type NamedCategory = {
  id: string;
  name: string;
};

/**
 * Folds a name to the form two categories are compared by: surrounding
 * whitespace removed and case ignored.
 *
 * `toLocaleLowerCase` rather than `toLowerCase` because the names are Ukrainian
 * as often as English, and this is the check that actually catches a Cyrillic
 * case-only duplicate — the unique index in the schema folds ASCII only.
 *
 * Exported because the CSV import matches the file's category values against
 * existing categories and has to fold them by exactly this rule. Two rules would
 * mean an import could create a category the management screen would refuse.
 */
export function foldCategoryName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

const fold = foldCategoryName;

/**
 * Validates a category name against every existing category.
 *
 * Pass `currentId` when renaming: that row is excluded from the duplicate
 * check, so confirming a name unchanged is accepted rather than rejected as a
 * clash with itself.
 *
 * On success the trimmed name is returned — that is what gets stored, so a name
 * typed with a trailing space is not stored as a distinct one.
 */
export function validateCategoryName(
  name: string,
  existing: NamedCategory[],
  currentId?: string,
): CategoryNameResult {
  const trimmed = name.trim();

  if (trimmed === '') {
    return { ok: false, reason: 'empty' };
  }

  const folded = fold(trimmed);
  const clash = existing.some(
    (category) => category.id !== currentId && fold(category.name) === folded,
  );

  if (clash) {
    return { ok: false, reason: 'duplicate' };
  }

  return { ok: true, name: trimmed };
}

/**
 * The user's own categories first and most recent first, the built-in ones
 * after in their seeded order.
 *
 * Stored order stays as it is — this is a display concern, and both screens
 * that show a full category list want the same answer, so the rule lives in one
 * place rather than being re-derived in each.
 *
 * The newest custom category leads because adding one is an act of intent: it
 * was created to be used, and the moment it is most likely to be wanted is
 * right after it exists. That is why the custom group is reversed rather than
 * sorted — it relies on being given the list in stored order, which is what
 * `listAll` returns, and `sort_order` only ever grows.
 */
export function customFirst<T extends { isBuiltin: boolean }>(categories: T[]): T[] {
  const custom = categories.filter((category) => !category.isBuiltin).reverse();
  const builtin = categories.filter((category) => category.isBuiltin);

  return [...custom, ...builtin];
}

/** How many of `categories` are the user's own. Where the divider goes. */
export function customCount(categories: { isBuiltin: boolean }[]): number {
  return categories.filter((category) => !category.isBuiltin).length;
}
