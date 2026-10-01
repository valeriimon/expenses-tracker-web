/**
 * Money handling. Amounts are integer minor units (kopiykas) everywhere except
 * the moment they are shown to or typed by a person.
 *
 * Floating point is avoided end to end: this screen's whole job is summing
 * amounts, and `0.1 + 0.2` drifts. Parsing splits the input string rather than
 * multiplying a float by 100, which is the same bug wearing a hat —
 * `Math.round(1.005 * 100)` is 100, not 101.
 */

export const CURRENCY_SYMBOL = '₴';

export type AmountParseResult =
  | { ok: true; minor: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'not-positive' };

/** Matches a plain decimal with at most two fractional digits. */
const AMOUNT_PATTERN = /^[0-9]+([.][0-9]{1,2})?$/;

/**
 * Groups digits in threes with a space, the Ukrainian convention: `12345` to
 * `12 345`.
 *
 * Written as a loop rather than a lookbehind regex because Hermes' support for
 * lookbehind has been inconsistent across versions, and a formatting helper is
 * not worth a runtime surprise on one platform.
 */
function groupThousands(digits: string): string {
  let out = '';
  for (let index = 0; index < digits.length; index += 1) {
    if (index > 0 && (digits.length - index) % 3 === 0) {
      out += ' ';
    }
    out += digits[index];
  }
  return out;
}

/**
 * Splits minor units into the grouped major part and the two-digit fraction,
 * dropping the fraction when it is zero — the reference journal records whole
 * hryvnia, and `2 060,00 ₴` on every row is noise.
 */
function splitMinor(minor: number): { body: string; negative: boolean } {
  const negative = minor < 0;
  const absolute = Math.abs(Math.trunc(minor));
  const major = Math.trunc(absolute / 100);
  const fraction = absolute % 100;
  const grouped = groupThousands(String(major));

  return {
    negative,
    body: fraction === 0 ? grouped : `${grouped},${String(fraction).padStart(2, '0')}`,
  };
}

/**
 * Display form with the currency symbol, e.g. `2 060 ₴` or `1 234,50 ₴`.
 *
 * For sums — a day total, a week total, an import total. The symbol is what
 * distinguishes a total from the entries above it; use `formatMinorBare` for
 * the entries themselves.
 */
export function formatMinor(minor: number): string {
  const { body, negative } = splitMinor(minor);
  return `${negative ? '-' : ''}${body} ${CURRENCY_SYMBOL}`;
}

/**
 * Display form without the currency symbol, e.g. `2 060` or `1 234,50`.
 *
 * For individual recorded amounts. The app records a single currency, so
 * repeating its symbol on every entry adds no information — the same reasoning
 * that already drops `,00` from whole amounts.
 *
 * A separate function rather than a flag on `formatMinor`, so each call site
 * states which of the two things it is showing rather than passing a bare
 * boolean. Both exits stay in this module, which is what keeps a later change
 * making the currency a user setting contained to one file.
 */
export function formatMinorBare(minor: number): string {
  const { body, negative } = splitMinor(minor);
  return `${negative ? '-' : ''}${body}`;
}

/**
 * Editable form without the symbol or grouping, for prefilling the amount field
 * when editing. Grouping spaces are omitted so the value round-trips back
 * through `parseAmount` exactly as the user left it.
 */
export function toAmountInput(minor: number): string {
  const absolute = Math.abs(Math.trunc(minor));
  const major = Math.trunc(absolute / 100);
  const fraction = absolute % 100;

  return fraction === 0 ? String(major) : `${major},${String(fraction).padStart(2, '0')}`;
}

/**
 * Parses typed input into minor units.
 *
 * Both `,` and `.` are accepted as the decimal separator: a Ukrainian keyboard
 * offers a comma, and rejecting it would read as a broken field.
 */
export function parseAmount(input: string): AmountParseResult {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: false, reason: 'empty' };
  }

  const normalized = trimmed.replace(/\s/g, '').replace(/,/g, '.');
  if (!AMOUNT_PATTERN.test(normalized)) {
    return { ok: false, reason: 'invalid' };
  }

  const [major, fraction = ''] = normalized.split('.');
  const minor = Number(major) * 100 + Number(fraction.padEnd(2, '0'));

  if (!Number.isSafeInteger(minor)) {
    return { ok: false, reason: 'invalid' };
  }
  if (minor <= 0) {
    return { ok: false, reason: 'not-positive' };
  }

  return { ok: true, minor };
}
