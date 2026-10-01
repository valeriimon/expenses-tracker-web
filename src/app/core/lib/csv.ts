/**
 * Reading comma-separated values, as a spreadsheet exports them.
 *
 * Written by hand rather than pulled from a package: the rules that matter here
 * are few, and they are exactly the ones a naive `split(',')` gets wrong — the
 * reference journal's descriptions are quoted fields listing items separated by
 * commas. A state machine over the characters is small enough to read and, being
 * pure, is directly testable.
 *
 * What is deliberately not handled is encoding. The caller decodes the file as
 * UTF-8; this module sees a string and never a byte.
 */

/** One record from the file, with the line it started on for error reporting. */
export type CsvRow = {
  /** 1-based line in the file, counting the header as line 1. */
  lineNumber: number;
  fields: string[];
};

export type CsvFile = {
  /** The separator that was detected, for the caller to report if it wants. */
  delimiter: string;
  /** The names in the first row. What the mapping step offers. */
  header: string[];
  /** Every record after the header. Field counts are not made to match. */
  rows: CsvRow[];
};

const SUPPORTED_DELIMITERS = [',', ';'] as const;

const QUOTE = '"';
const BOM = '﻿';

/**
 * Counts each candidate separator in the first record, ignoring any inside a
 * quoted field.
 *
 * Quotes are delimiter-agnostic, so this can run before the delimiter is known.
 * The scan stops at the first record boundary rather than reading the whole
 * file: the header is what the user is about to see in the mapping step, so it
 * is the line whose reading has to be right.
 */
function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(SUPPORTED_DELIMITERS.map((d) => [d, 0]));
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === QUOTE) {
        if (text[index + 1] === QUOTE) {
          index += 1;
        } else {
          inQuotes = false;
        }
      }
      continue;
    }

    if (char === QUOTE) {
      inQuotes = true;
    } else if (char === '\n' || char === '\r') {
      break;
    } else if (counts.has(char)) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
  }

  // A tie — including a single-column file, where both counts are zero — falls
  // to the comma, which is what the format is named after.
  let best: string = SUPPORTED_DELIMITERS[0];
  for (const delimiter of SUPPORTED_DELIMITERS) {
    if ((counts.get(delimiter) ?? 0) > (counts.get(best) ?? 0)) {
      best = delimiter;
    }
  }

  return best;
}

/**
 * Splits the text into records of fields.
 *
 * A field wrapped in quotes may contain the delimiter and line breaks, and a
 * doubled quote inside one is a single literal quote. Outside quotes, a quote is
 * an ordinary character: files in the wild contain stray ones, and refusing to
 * read the row would be a worse answer than keeping it.
 *
 * A line break inside a quoted field is kept as `\n` whatever form it took in
 * the file, so a description does not carry a stray carriage return into the
 * database.
 */
function splitRecords(text: string, delimiter: string): CsvRow[] {
  const rows: CsvRow[] = [];

  let fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let recordStartLine = 1;

  const endField = () => {
    fields.push(field);
    field = '';
  };

  const endRecord = () => {
    endField();

    // A blank line is not a record with one empty field, it is nothing. Skipping
    // it here keeps a trailing newline — which every well-behaved writer emits —
    // from becoming a row that fails the field-count check.
    const blank = fields.length === 1 && fields[0] === '';
    if (!blank) {
      rows.push({ lineNumber: recordStartLine, fields });
    }

    fields = [];
    recordStartLine = line;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === QUOTE) {
        if (text[index + 1] === QUOTE) {
          field += QUOTE;
          index += 1;
        } else {
          inQuotes = false;
        }
      } else if (char === '\r') {
        // Normalise a CRLF inside a quoted field to a single newline.
        field += '\n';
        line += 1;
        if (text[index + 1] === '\n') {
          index += 1;
        }
      } else {
        if (char === '\n') {
          line += 1;
        }
        field += char;
      }
      continue;
    }

    if (char === QUOTE && field === '') {
      inQuotes = true;
    } else if (char === delimiter) {
      endField();
    } else if (char === '\r' || char === '\n') {
      line += 1;
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
      endRecord();
    } else {
      field += char;
    }
  }

  // Whatever is still being accumulated is a final record without a trailing
  // newline. An empty one is dropped by the blank check in `endRecord`.
  if (field !== '' || fields.length > 0) {
    endRecord();
  }

  return rows;
}

/**
 * Reads a CSV file's text into its header and its records.
 *
 * A leading byte-order mark is removed first: Excel writes one, and left in
 * place it becomes an invisible part of the first column's name, which would
 * show up as a mapping dropdown that looks right and does not match.
 *
 * Records are returned with whatever field count they had. Making them match
 * the header is not this function's decision — a row of the wrong width is a
 * row the import has to report by line number, not one to pad or drop.
 */
export function parseCsv(text: string): CsvFile {
  const body = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  const delimiter = detectDelimiter(body);
  const records = splitRecords(body, delimiter);

  if (records.length === 0) {
    return { delimiter, header: [], rows: [] };
  }

  const [header, ...rows] = records;

  return { delimiter, header: header.fields, rows };
}
