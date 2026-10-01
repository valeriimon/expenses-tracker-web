import { Component, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, close } from 'ionicons/icons';

import { AppDb } from '../../core/db/app-db';
import { listAll, type Category } from '../../core/db/categories';
import { importPlan, listExistingKeys, type ImportResult } from '../../core/db/import';
import { parseCsv, type CsvRow } from '../../core/lib/csv';
import { formatMinorBare } from '../../core/lib/currency';
import { formatFullDate } from '../../core/lib/dates';
import {
  APP_FIELDS,
  APP_FIELD_LABELS,
  assignColumn,
  buildImportPlan,
  DATE_FORMATS,
  dateFormatHasYear,
  EMPTY_MAPPING,
  FALLBACK_CATEGORY_ID,
  missingRequiredFields,
  REQUIRED_APP_FIELDS,
  type AppField,
  type ColumnMapping,
  type DateFormat,
  type ImportRowError,
} from '../../core/lib/import';
import { WeekStore } from '../../core/state/week-store';
import { ChoiceListComponent, type Choice } from '../../ui/choice-list.component';

/**
 * What the app will read. Beyond this a file is refused rather than risked:
 * the whole thing is held in memory as text and again as rows, which is fine at
 * the scale a personal expense journal reaches and is a frozen tab if someone
 * picks a database dump.
 */
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;

/** How many rows the preview shows. Enough to recognise the file, not a table. */
const SAMPLE_SIZE = 8;

const NONE = 'none';

const TOO_LARGE = `That file is larger than ${MAX_BYTES / 1024 / 1024} MB, which is more than the app can import at once.`;

const ERROR_TEXT: Record<ImportRowError, string> = {
  'field-count': 'has a different number of columns than the header',
  date: 'has a date that does not match the chosen format',
  description: 'has no description',
  amount: 'has an amount that is empty, not a number, or not above zero',
};

type Step = 'file' | 'mapping' | 'dateFormat' | 'preview' | 'result';

type MappingField = {
  field: AppField;
  label: string;
  options: Choice[];
};

/**
 * The whole import, as steps on one page.
 *
 * Every step's state lives here rather than in the URL: the parsed file has no
 * business being serialised into an address, and going back a step must not
 * lose it — the point of "change the mapping and preview again" is that the
 * file is not read a second time.
 *
 * Nothing is written before the user confirms the preview. Up to that moment
 * this page has only read a file and the existing categories.
 */
@Component({
  selector: 'app-import',
  templateUrl: 'import.page.html',
  styleUrls: ['import.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    ChoiceListComponent,
  ],
})
export class ImportPage {
  private readonly db = inject(AppDb);
  private readonly nav = inject(NavController);
  private readonly weeks = inject(WeekStore);

  protected readonly formatMinorBare = formatMinorBare;
  protected readonly formatFullDate = formatFullDate;
  protected readonly errorText = ERROR_TEXT;

  protected readonly step = signal<Step>('file');
  protected readonly fileName = signal<string | null>(null);
  protected readonly header = signal<string[]>([]);
  protected readonly rows = signal<CsvRow[]>([]);
  protected readonly mapping = signal<ColumnMapping>(EMPTY_MAPPING);
  protected readonly dateFormat = signal<DateFormat>('DD.MM');
  protected readonly year = signal(new Date().getFullYear());
  /** Why a chosen file was refused, shown on the file step. */
  protected readonly message = signal<string | null>(null);
  protected readonly result = signal<ImportResult | null>(null);
  protected readonly busy = signal(false);

  /**
   * The snapshot every duplicate is judged against, loaded when a file is read
   * and again after an import — never while one is being previewed, so what
   * the preview promised is what gets written.
   */
  private readonly categories = signal<Category[]>([]);
  private readonly existingKeys = signal<Set<string>>(new Set());

  /** The earliest day the last import wrote to, which is where the log is taken. */
  private firstImportedDay: string | null = null;

  protected readonly plan = computed(() =>
    buildImportPlan({
      rows: this.rows(),
      headerLength: this.header().length,
      mapping: this.mapping(),
      dateFormat: this.dateFormat(),
      year: this.year(),
      existingCategories: this.categories(),
      existingKeys: this.existingKeys(),
    }),
  );

  /**
   * One list of the file's columns per app field. Each column is shown with its
   * first value, since a header called `Сума (грн)` means nothing to someone
   * who has not looked at their own spreadsheet lately.
   *
   * Category offers a "leave unmapped" option because it is the one field the
   * app can supply itself — everything imported without one lands in `Other`.
   */
  protected readonly mappingFields = computed<MappingField[]>(() => {
    const header = this.header();
    const sample = this.rows()[0]?.fields ?? [];
    const mapping = this.mapping();

    return APP_FIELDS.map((field) => ({
      field,
      label: APP_FIELD_LABELS[field] + (REQUIRED_APP_FIELDS.includes(field) ? '' : ' (optional)'),
      options: [
        ...header.map((name, index) => ({
          key: String(index),
          label: name === '' ? `Column ${index + 1}` : name,
          hint: sample[index] === undefined || sample[index] === '' ? undefined : sample[index],
          selected: mapping[field] === index,
        })),
        ...(field === 'category'
          ? [
              {
                key: NONE,
                label: 'Leave unmapped',
                hint: `Everything imported goes to ${this.fallbackCategoryName()}`,
                selected: mapping.category === null,
              },
            ]
          : []),
      ],
    }));
  });

  protected readonly missingFields = computed(() =>
    missingRequiredFields(this.mapping())
      .map((field) => APP_FIELD_LABELS[field])
      .join(', '),
  );

  protected readonly dateFormatOptions = computed<Choice[]>(() =>
    DATE_FORMATS.map((option) => ({
      key: option.value,
      label: option.value,
      hint: option.example,
      selected: option.value === this.dateFormat(),
    })),
  );

  protected readonly needsYear = computed(() => !dateFormatHasYear(this.dateFormat()));

  /** A few date values from the file, so the user can see what they are matching. */
  protected readonly dateSamples = computed(() => {
    const column = this.mapping().date;
    if (column === null) {
      return [];
    }

    return Array.from(
      new Set(
        this.rows()
          .slice(0, 5)
          .map((row) => row.fields[column]?.trim())
          .filter((value): value is string => value !== undefined && value !== ''),
      ),
    ).slice(0, 3);
  });

  protected readonly sample = computed(() => this.plan().rows.slice(0, SAMPLE_SIZE));

  protected readonly fallbackCategoryName = computed(
    () =>
      this.categories().find((category) => category.id === FALLBACK_CATEGORY_ID)?.name ?? 'Other',
  );

  constructor() {
    addIcons({ chevronBack, chevronForward, close });
  }

  private async loadExisting(): Promise<void> {
    const [categories, keys] = await Promise.all([listAll(this.db), listExistingKeys(this.db)]);
    this.categories.set(categories);
    this.existingKeys.set(keys);
  }

  private reset(message: string | null = null): void {
    this.step.set('file');
    this.fileName.set(null);
    this.header.set([]);
    this.rows.set([]);
    this.mapping.set(EMPTY_MAPPING);
    this.message.set(message);
    this.result.set(null);
  }

  protected async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Cleared so that choosing the same file again — after fixing it — still
    // fires a change.
    input.value = '';

    // Dismissing the chooser selects nothing and leaves everything as it was.
    if (file === undefined) {
      return;
    }

    // The declared type is a hint, not a guarantee: a CSV arrives labelled as
    // text/plain, as a spreadsheet type, or as nothing at all. Whether the file
    // can be read is decided by parsing it, not by what it claims to be.
    if (file.size > MAX_BYTES) {
      this.reset(TOO_LARGE);
      return;
    }

    this.busy.set(true);

    try {
      // Read as UTF-8, which is what a spreadsheet exports. A file saved in a
      // legacy encoding will show mangled text in the preview, which is the
      // point at which to re-save it rather than import it.
      const parsed = parseCsv(await file.text());

      if (parsed.header.length === 0 || parsed.rows.length === 0) {
        this.reset('That file has no expenses in it — it is empty or has only a header row.');
        return;
      }

      if (parsed.rows.length > MAX_ROWS) {
        this.reset(
          `That file has ${parsed.rows.length} rows, and the app imports at most ${MAX_ROWS} at once.`,
        );
        return;
      }

      await this.loadExisting();

      this.fileName.set(file.name);
      this.header.set(parsed.header);
      this.rows.set(parsed.rows);
      this.mapping.set(EMPTY_MAPPING);
      this.message.set(null);
      this.result.set(null);
      this.step.set('mapping');
    } catch {
      this.reset('That file could not be read. Check that it is a CSV saved as UTF-8.');
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Maps a column to a field. A column already supplying another field is
   * moved rather than refused — see `assignColumn`.
   */
  protected mapField(field: AppField, key: string): void {
    this.mapping.update((mapping) =>
      assignColumn(mapping, field, key === NONE ? null : Number(key)),
    );
  }

  protected chooseDateFormat(key: string): void {
    this.dateFormat.set(key as DateFormat);
  }

  protected chooseAnotherFile(): void {
    this.reset();
  }

  protected async confirm(): Promise<void> {
    this.busy.set(true);

    try {
      const result = await importPlan(this.db, this.plan());
      // The first imported day is read before the snapshot is refreshed: once
      // it is, the plan sees every row as a duplicate and holds none of them.
      this.firstImportedDay = this.plan().rows.reduce<string | null>(
        (found, row) => (found === null || row.occurredOn < found ? row.occurredOn : found),
        null,
      );
      await this.loadExisting();
      this.result.set(result);
      this.step.set('result');
    } catch {
      this.reset('The import could not be completed, so nothing was imported. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  protected viewExpenses(): void {
    // The log is taken to the week the imported expenses start in, using the
    // same anchor the entry form uses after saving into another week.
    if (this.firstImportedDay !== null) {
      this.weeks.anchorDate.set(this.firstImportedDay);
    }
    this.nav.navigateRoot('/tabs/expenses');
  }

  protected close(): void {
    this.nav.navigateBack('/tabs/data');
  }
}
