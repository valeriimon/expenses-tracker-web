import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('reads a plain file into a header and rows', () => {
    const file = parseCsv('Date,Description,Amount\n05.08,Coffee,124\n06.08,Water,300\n');

    expect(file.header).toEqual(['Date', 'Description', 'Amount']);
    expect(file.rows).toEqual([
      { lineNumber: 2, fields: ['05.08', 'Coffee', '124'] },
      { lineNumber: 3, fields: ['06.08', 'Water', '300'] },
    ]);
  });

  it('keeps a quoted field containing the delimiter whole', () => {
    const file = parseCsv(
      'Date,Description,Amount\n05.08,"Скупився: овочі, бакалія, м\'ясо",2060\n',
    );

    expect(file.rows[0].fields).toEqual([
      '05.08',
      "Скупився: овочі, бакалія, м'ясо",
      '2060',
    ]);
  });

  it('reads a doubled quote inside a quoted field as one literal quote', () => {
    const file = parseCsv('Description\n"He said ""hello"" twice"\n');

    expect(file.rows[0].fields).toEqual(['He said "hello" twice']);
  });

  it('treats a quote inside an unquoted field as an ordinary character', () => {
    const file = parseCsv('Description\n6" pipe\n');

    expect(file.rows[0].fields).toEqual(['6" pipe']);
  });

  it('reads CRLF line endings', () => {
    const file = parseCsv('Date,Amount\r\n05.08,124\r\n06.08,300\r\n');

    expect(file.header).toEqual(['Date', 'Amount']);
    expect(file.rows).toEqual([
      { lineNumber: 2, fields: ['05.08', '124'] },
      { lineNumber: 3, fields: ['06.08', '300'] },
    ]);
  });

  it('normalises a line break inside a quoted field', () => {
    const file = parseCsv('Description,Amount\r\n"first\r\nsecond",124\r\n');

    expect(file.rows[0].fields).toEqual(['first\nsecond', '124']);
  });

  it('counts lines past a quoted field that spans several of them', () => {
    const file = parseCsv('Description,Amount\n"first\nsecond",124\nCoffee,300\n');

    expect(file.rows[1]).toEqual({ lineNumber: 4, fields: ['Coffee', '300'] });
  });

  it('produces no empty row for a trailing newline', () => {
    expect(parseCsv('Date,Amount\n05.08,124\n').rows).toHaveLength(1);
    expect(parseCsv('Date,Amount\n05.08,124').rows).toHaveLength(1);
  });

  it('skips blank lines rather than reading them as rows', () => {
    const file = parseCsv('Date,Amount\n05.08,124\n\n06.08,300\n\n');

    expect(file.rows).toEqual([
      { lineNumber: 2, fields: ['05.08', '124'] },
      { lineNumber: 4, fields: ['06.08', '300'] },
    ]);
  });

  it('detects a semicolon-delimited file and reads it the same way', () => {
    const comma = parseCsv('Date,Description,Amount\n05.08,Coffee,124\n');
    const semicolon = parseCsv('Date;Description;Amount\n05.08;Coffee;124\n');

    expect(semicolon.delimiter).toBe(';');
    expect(semicolon.header).toEqual(comma.header);
    expect(semicolon.rows).toEqual(comma.rows);
  });

  it('does not count a delimiter inside a quoted header name', () => {
    const file = parseCsv('"Date, full";Amount\n05.08;124\n');

    expect(file.delimiter).toBe(';');
    expect(file.header).toEqual(['Date, full', 'Amount']);
  });

  it('strips a leading byte-order mark from the first column name', () => {
    const file = parseCsv('﻿Date,Amount\n05.08,124\n');

    expect(file.header).toEqual(['Date', 'Amount']);
  });

  it('keeps a short row and a long row at their own width', () => {
    const file = parseCsv('Date,Description,Amount\n05.08,Coffee\n06.08,Water,300,extra\n');

    expect(file.rows[0].fields).toHaveLength(2);
    expect(file.rows[1].fields).toHaveLength(4);
  });

  it('reads a header-only file as no rows', () => {
    const file = parseCsv('Date,Description,Amount\n');

    expect(file.header).toEqual(['Date', 'Description', 'Amount']);
    expect(file.rows).toEqual([]);
  });

  it('reads an empty file as no header and no rows', () => {
    expect(parseCsv('')).toEqual({ delimiter: ',', header: [], rows: [] });
  });

  it('keeps empty fields rather than collapsing them', () => {
    const file = parseCsv('Date,Category,Amount\n05.08,,124\n');

    expect(file.rows[0].fields).toEqual(['05.08', '', '124']);
  });
});
