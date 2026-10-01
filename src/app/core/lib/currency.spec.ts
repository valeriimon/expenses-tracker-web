import { formatMinor, formatMinorBare, parseAmount, toAmountInput } from './currency';

describe('formatMinor', () => {
  it('drops the fraction when the amount is whole', () => {
    expect(formatMinor(206000)).toBe('2 060 ₴');
    expect(formatMinor(70000)).toBe('700 ₴');
  });

  it('shows two fractional digits when there are any', () => {
    expect(formatMinor(123450)).toBe('1 234,50 ₴');
    expect(formatMinor(105)).toBe('1,05 ₴');
  });

  it('groups thousands in threes', () => {
    expect(formatMinor(100)).toBe('1 ₴');
    expect(formatMinor(99900)).toBe('999 ₴');
    expect(formatMinor(100000)).toBe('1 000 ₴');
    expect(formatMinor(1622000)).toBe('16 220 ₴');
    expect(formatMinor(123456789)).toBe('1 234 567,89 ₴');
  });

  it('formats zero', () => {
    expect(formatMinor(0)).toBe('0 ₴');
  });
});

describe('formatMinorBare', () => {
  it('drops the fraction when the amount is whole', () => {
    expect(formatMinorBare(206000)).toBe('2 060');
    expect(formatMinorBare(70000)).toBe('700');
  });

  it('shows two fractional digits when there are any', () => {
    expect(formatMinorBare(123450)).toBe('1 234,50');
    expect(formatMinorBare(105)).toBe('1,05');
  });

  it('groups thousands in threes', () => {
    expect(formatMinorBare(100000)).toBe('1 000');
    expect(formatMinorBare(123456789)).toBe('1 234 567,89');
  });

  it('formats zero', () => {
    expect(formatMinorBare(0)).toBe('0');
  });

  it('keeps a negative sign', () => {
    expect(formatMinorBare(-105)).toBe('-1,05');
  });

  it('is formatMinor without the symbol', () => {
    for (const minor of [0, 1, 100, 105, 206000, 123456789]) {
      expect(`${formatMinorBare(minor)} ₴`).toBe(formatMinor(minor));
    }
  });
});

describe('toAmountInput', () => {
  it('omits grouping and the symbol so the value can be re-parsed', () => {
    expect(toAmountInput(206000)).toBe('2060');
    expect(toAmountInput(123450)).toBe('1234,50');
  });

  it('round-trips through parseAmount', () => {
    for (const minor of [1, 100, 105, 206000, 123450, 123456789]) {
      const parsed = parseAmount(toAmountInput(minor));
      expect(parsed).toEqual({ ok: true, minor });
    }
  });
});

describe('parseAmount', () => {
  it('accepts a whole number', () => {
    expect(parseAmount('2060')).toEqual({ ok: true, minor: 206000 });
  });

  it('accepts either decimal separator', () => {
    expect(parseAmount('1234,50')).toEqual({ ok: true, minor: 123450 });
    expect(parseAmount('1234.50')).toEqual({ ok: true, minor: 123450 });
  });

  it('pads a single fractional digit', () => {
    expect(parseAmount('12,5')).toEqual({ ok: true, minor: 1250 });
  });

  it('ignores surrounding and grouping whitespace', () => {
    expect(parseAmount('  2060  ')).toEqual({ ok: true, minor: 206000 });
    expect(parseAmount('16 220')).toEqual({ ok: true, minor: 1622000 });
  });

  it('does not drift on values that break float arithmetic', () => {
    // Math.round(1.005 * 100) is 100 in IEEE 754; string splitting gives 101.
    expect(parseAmount('1,005')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmount('10,05')).toEqual({ ok: true, minor: 1005 });
    expect(parseAmount('0,29')).toEqual({ ok: true, minor: 29 });
  });

  it('rejects empty input', () => {
    expect(parseAmount('')).toEqual({ ok: false, reason: 'empty' });
    expect(parseAmount('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects non-numeric input', () => {
    expect(parseAmount('abc')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmount('12abc')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmount('1.2.3')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmount('1,2,3')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmount('.5')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseAmount('12,345')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects zero and negative amounts', () => {
    expect(parseAmount('0')).toEqual({ ok: false, reason: 'not-positive' });
    expect(parseAmount('0,00')).toEqual({ ok: false, reason: 'not-positive' });
    // The minus sign is not part of the accepted pattern at all.
    expect(parseAmount('-5')).toEqual({ ok: false, reason: 'invalid' });
  });
});
