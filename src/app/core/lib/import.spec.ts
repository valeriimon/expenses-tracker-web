import type { NamedCategory } from './categories';
import { parseCsv } from './csv';
import {
  assignColumn,
  buildImportPlan,
  dateFormatHasYear,
  EMPTY_MAPPING,
  expenseKey,
  missingRequiredFields,
  parseImportDate,
  type ColumnMapping,
} from './import';
import { REFERENCE_CSV } from './import.fixture';

const EXISTING: NamedCategory[] = [
  { id: 'groceries', name: 'Groceries' },
  { id: 'other', name: 'Other' },
  { id: 'custom-1', name: 'Продукти' },
];

/** The reference file's mapping: date, week, category, description, amount. */
const REFERENCE_MAPPING: ColumnMapping = {
  date: 0,
  description: 3,
  amount: 4,
  category: 2,
};

function planOf(csv: string, overrides: Partial<Parameters<typeof buildImportPlan>[0]> = {}) {
  const file = parseCsv(csv);

  return buildImportPlan({
    rows: file.rows,
    headerLength: file.header.length,
    mapping: REFERENCE_MAPPING,
    dateFormat: 'DD.MM',
    year: 2026,
    existingCategories: EXISTING,
    existingKeys: new Set<string>(),
    ...overrides,
  });
}

describe('parseImportDate', () => {
  it('reads a day-first value without a year using the fallback year', () => {
    expect(parseImportDate('05.08', 'DD.MM', 2026)).toEqual({ ok: true, iso: '2026-08-05' });
  });

  it('reads the same value as month-first under MM/DD/YYYY', () => {
    expect(parseImportDate('08/05/2026', 'MM/DD/YYYY', 1999)).toEqual({
      ok: true,
      iso: '2026-08-05',
    });
    expect(parseImportDate('05/08/2026', 'DD/MM/YYYY', 1999)).toEqual({
      ok: true,
      iso: '2026-08-05',
    });
  });

  it('ignores the fallback year for a format that carries one', () => {
    expect(parseImportDate('05.08.2024', 'DD.MM.YYYY', 2026)).toEqual({
      ok: true,
      iso: '2024-08-05',
    });
  });

  it('reads an ISO value', () => {
    expect(parseImportDate('2026-08-05', 'YYYY-MM-DD', 1999)).toEqual({
      ok: true,
      iso: '2026-08-05',
    });
  });

  it('accepts a single-digit day and month', () => {
    expect(parseImportDate('5.8', 'DD.MM', 2026)).toEqual({ ok: true, iso: '2026-08-05' });
  });

  it('trims surrounding whitespace', () => {
    expect(parseImportDate('  05.08  ', 'DD.MM', 2026)).toEqual({ ok: true, iso: '2026-08-05' });
  });

  it('rejects a date that has the right shape but does not exist', () => {
    expect(parseImportDate('31.02', 'DD.MM', 2026)).toEqual({ ok: false });
    expect(parseImportDate('00.08', 'DD.MM', 2026)).toEqual({ ok: false });
    expect(parseImportDate('05.13', 'DD.MM', 2026)).toEqual({ ok: false });
  });

  it('accepts a leap day only in a leap year', () => {
    expect(parseImportDate('29.02', 'DD.MM', 2024)).toEqual({ ok: true, iso: '2024-02-29' });
    expect(parseImportDate('29.02', 'DD.MM', 2026)).toEqual({ ok: false });
  });

  it('rejects a value that does not match the chosen format', () => {
    expect(parseImportDate('05/08', 'DD.MM', 2026)).toEqual({ ok: false });
    expect(parseImportDate('2026-08-05', 'DD.MM.YYYY', 2026)).toEqual({ ok: false });
    expect(parseImportDate('', 'DD.MM', 2026)).toEqual({ ok: false });
    expect(parseImportDate('yesterday', 'DD.MM', 2026)).toEqual({ ok: false });
  });

  it('knows which formats need a year supplied', () => {
    expect(dateFormatHasYear('DD.MM')).toBe(false);
    expect(dateFormatHasYear('DD.MM.YYYY')).toBe(true);
  });
});

describe('buildImportPlan — row validation', () => {
  it('reads a valid row into an expense', () => {
    const plan = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,Тиждень 1,Продукти,Хліб,84\n');

    expect(plan.errors).toEqual([]);
    expect(plan.rows).toEqual([
      {
        lineNumber: 2,
        occurredOn: '2026-08-05',
        description: 'Хліб',
        amountMinor: 8400,
        categoryKey: 'продукти',
        categoryName: 'Продукти',
      },
    ]);
  });

  it('reads the amount shapes the reference file uses', () => {
    const plan = planOf(
      'Дата,Тиждень,Категорія,Опис,Сума\n' +
        '05.08,x,Продукти,Whole,2060\n' +
        '05.08,x,Продукти,Grouped,1 234\n' +
        '05.08,x,Продукти,Comma,"840,50"\n' +
        '05.08,x,Продукти,Point,84.50\n',
    );

    expect(plan.errors).toEqual([]);
    expect(plan.rows.map((row) => row.amountMinor)).toEqual([206000, 123400, 84050, 8450]);
  });

  it('reports a row whose date does not parse, with its line and value', () => {
    const plan = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,x,Продукти,Хліб,84\n31.02,x,Продукти,Хліб,84\n');

    expect(plan.errors).toEqual([{ lineNumber: 3, reason: 'date', value: '31.02' }]);
  });

  it('reports a row whose description is empty or only whitespace', () => {
    const plan = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,x,Продукти,"   ",84\n');

    expect(plan.errors).toEqual([{ lineNumber: 2, reason: 'description', value: '' }]);
  });

  it('reports an amount that is empty, not a number, zero, or negative', () => {
    const plan = planOf(
      'Дата,Тиждень,Категорія,Опис,Сума\n' +
        '05.08,x,Продукти,Empty,\n' +
        '05.08,x,Продукти,Words,abc\n' +
        '05.08,x,Продукти,Zero,0\n' +
        '05.08,x,Продукти,Negative,-5\n',
    );

    expect(plan.errors).toEqual([
      { lineNumber: 2, reason: 'amount', value: '' },
      { lineNumber: 3, reason: 'amount', value: 'abc' },
      { lineNumber: 4, reason: 'amount', value: '0' },
      { lineNumber: 5, reason: 'amount', value: '-5' },
    ]);
  });

  it('reports a row whose field count differs from the header', () => {
    const plan = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,x,Продукти,Хліб\n');

    expect(plan.errors).toEqual([{ lineNumber: 2, reason: 'field-count', value: '4' }]);
  });

  it('imports nothing at all when any row fails', () => {
    const plan = planOf(
      'Дата,Тиждень,Категорія,Опис,Сума\n' +
        '05.08,x,Нова,Good,84\n' +
        '99.99,x,Нова,Bad,84\n',
    );

    expect(plan.rows).toEqual([]);
    expect(plan.newCategoryNames).toEqual([]);
    expect(plan.duplicates).toBe(0);
    expect(plan.errors).toHaveLength(1);
  });
});

describe('buildImportPlan — categories', () => {
  it('reuses an existing category, ignoring case and surrounding whitespace', () => {
    const plan = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,x,"  ПРОДУКТИ ",Хліб,84\n');

    expect(plan.newCategoryNames).toEqual([]);
    expect(plan.rows[0].categoryKey).toBe('продукти');
  });

  it('collects a category the app does not have', () => {
    const plan = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,x,Тварини,Корм,251\n');

    expect(plan.newCategoryNames).toEqual(['Тварини']);
    expect(plan.rows[0].categoryKey).toBe('тварини');
  });

  it('creates one category for many rows naming it in different cases', () => {
    const plan = planOf(
      'Дата,Тиждень,Категорія,Опис,Сума\n' +
        '05.08,x,Тварини,A,251\n' +
        '06.08,x,ТВАРИНИ,B,252\n' +
        '07.08,x,"  тварини  ",C,253\n',
    );

    expect(plan.newCategoryNames).toEqual(['Тварини']);
    expect(plan.rows.map((row) => row.categoryKey)).toEqual(['тварини', 'тварини', 'тварини']);
  });

  it('falls back for an empty category value rather than failing the row', () => {
    const plan = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,x,"  ",Хліб,84\n');

    expect(plan.errors).toEqual([]);
    expect(plan.rows[0].categoryKey).toBeNull();
    expect(plan.newCategoryNames).toEqual([]);
  });

  it('falls back for every row when the category field is unmapped', () => {
    const plan = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,x,Тварини,Корм,251\n', {
      mapping: { ...REFERENCE_MAPPING, category: null },
    });

    expect(plan.rows[0].categoryKey).toBeNull();
    expect(plan.newCategoryNames).toEqual([]);
  });

  it('ignores columns that are not mapped to any field', () => {
    const withWeek = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,Тиждень 1,Продукти,Хліб,84\n');
    const withoutWeek = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,ЩОСЬ ІНШЕ,Продукти,Хліб,84\n');

    expect(withWeek.rows).toEqual(withoutWeek.rows);
  });
});

describe('buildImportPlan — duplicates', () => {
  const csv =
    'Дата,Тиждень,Категорія,Опис,Сума\n' +
    '05.08,x,Продукти,Хліб,84\n' +
    '06.08,x,Продукти,Молоко,120\n';

  it('skips a row matching an expense already recorded', () => {
    const plan = planOf(csv, {
      existingKeys: new Set([expenseKey('2026-08-05', 'Хліб', 8400)]),
    });

    expect(plan.duplicates).toBe(1);
    expect(plan.rows.map((row) => row.description)).toEqual(['Молоко']);
    expect(plan.errors).toEqual([]);
  });

  it('skips every row when the same file is imported twice', () => {
    const plan = planOf(csv, {
      existingKeys: new Set([
        expenseKey('2026-08-05', 'Хліб', 8400),
        expenseKey('2026-08-06', 'Молоко', 12000),
      ]),
    });

    expect(plan.rows).toEqual([]);
    expect(plan.duplicates).toBe(2);
  });

  it('imports both of two identical rows within one file', () => {
    const plan = planOf(
      'Дата,Тиждень,Категорія,Опис,Сума\n' +
        '12.08,x,Шкідливі звички,2 пачки цигарок,350\n' +
        '12.08,x,Шкідливі звички,2 пачки цигарок,350\n',
    );

    expect(plan.rows).toHaveLength(2);
    expect(plan.duplicates).toBe(0);
  });

  it('matches a duplicate on the trimmed description the import would write', () => {
    const plan = planOf('Дата,Тиждень,Категорія,Опис,Сума\n05.08,x,Продукти,"  Хліб  ",84\n', {
      existingKeys: new Set([expenseKey('2026-08-05', 'Хліб', 8400)]),
    });

    expect(plan.duplicates).toBe(1);
  });

  it('does not treat a different amount or day as a duplicate', () => {
    const plan = planOf(csv, {
      existingKeys: new Set([expenseKey('2026-08-05', 'Хліб', 8500)]),
    });

    expect(plan.duplicates).toBe(0);
    expect(plan.rows).toHaveLength(2);
  });
});

describe('buildImportPlan — the reference export', () => {
  const file = parseCsv(REFERENCE_CSV);

  it('reads the reference file as the app expects it', () => {
    expect(file.header).toEqual(['Дата', 'Тиждень', 'Категорія', 'Опис', 'Сума (грн)']);
    expect(file.rows).toHaveLength(35);
  });

  it('imports every row with no errors', () => {
    const plan = buildImportPlan({
      rows: file.rows,
      headerLength: file.header.length,
      mapping: REFERENCE_MAPPING,
      dateFormat: 'DD.MM',
      year: 2026,
      existingCategories: [{ id: 'other', name: 'Other' }],
      existingKeys: new Set<string>(),
    });

    expect(plan.errors).toEqual([]);
    expect(plan.rows).toHaveLength(35);
    expect(plan.duplicates).toBe(0);
    expect(plan.rows[0]).toEqual({
      lineNumber: 2,
      occurredOn: '2026-08-05',
      description: "Скупився: овочі, бакалія, тунець, молочка, яйця, м'ясо",
      amountMinor: 206000,
      categoryKey: 'продукти',
      categoryName: 'Продукти',
    });
    // Fourteen distinct category names, none of which the seeded English list has.
    expect(plan.newCategoryNames).toHaveLength(14);
    expect(plan.newCategoryNames).toContain('Продукти');
    expect(plan.newCategoryNames).toContain('Шкідливі звички');
  });

  it('skips the whole file on a second import', () => {
    const first = buildImportPlan({
      rows: file.rows,
      headerLength: file.header.length,
      mapping: REFERENCE_MAPPING,
      dateFormat: 'DD.MM',
      year: 2026,
      existingCategories: [{ id: 'other', name: 'Other' }],
      existingKeys: new Set<string>(),
    });

    const second = buildImportPlan({
      rows: file.rows,
      headerLength: file.header.length,
      mapping: REFERENCE_MAPPING,
      dateFormat: 'DD.MM',
      year: 2026,
      existingCategories: [
        { id: 'other', name: 'Other' },
        ...first.newCategoryNames.map((name, index) => ({ id: `new-${index}`, name })),
      ],
      existingKeys: new Set(
        first.rows.map((row) => expenseKey(row.occurredOn, row.description, row.amountMinor)),
      ),
    });

    expect(second.rows).toEqual([]);
    expect(second.newCategoryNames).toEqual([]);
    expect(second.duplicates).toBe(35);
  });
});

describe('mapping helpers', () => {
  it('names the fields still needing a column', () => {
    expect(missingRequiredFields(EMPTY_MAPPING)).toEqual(['date', 'description', 'amount']);
    expect(missingRequiredFields(REFERENCE_MAPPING)).toEqual([]);
    expect(missingRequiredFields({ ...REFERENCE_MAPPING, category: null })).toEqual([]);
  });

  it('moves a column rather than letting it supply two fields', () => {
    const mapping = assignColumn(REFERENCE_MAPPING, 'description', 0);

    expect(mapping.description).toBe(0);
    expect(mapping.date).toBeNull();
    expect(mapping.amount).toBe(4);
  });

  it('clears a field without touching the others', () => {
    const mapping = assignColumn(REFERENCE_MAPPING, 'category', null);

    expect(mapping.category).toBeNull();
    expect(mapping.date).toBe(0);
  });
});
