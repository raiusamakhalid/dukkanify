import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../common/errors/domain.error';
import { Money } from './money.vo';

describe('Money.fromDecimalString', () => {
  it('reads a fixed-point string exactly', () => {
    expect(Money.fromDecimalString('19.99', 'AED').minorUnits).toBe(1999);
  });

  it('round-trips without drifting', () => {
    expect(Money.fromDecimalString('249.00', 'AED').toDecimalString()).toBe(
      '249.00',
    );
  });

  it.each(['19.9', '19', '19.999', '-19.99', 'nineteen'])(
    'refuses "%s"',
    (amount) => {
      expect(() => Money.fromDecimalString(amount, 'AED')).toThrow(
        ValidationError,
      );
    },
  );
});

describe('Money.fromNumber', () => {
  it('clamps a generated price to two decimal places', () => {
    expect(Money.fromNumber(249.567, 'AED').toDecimalString()).toBe('249.57');
  });

  it('keeps a price a float cannot hold exactly', () => {
    expect(Money.fromNumber(19.99, 'AED').toDecimalString()).toBe('19.99');
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses %s',
    (amount: number) => {
      expect(() => Money.fromNumber(amount, 'AED')).toThrow(ValidationError);
    },
  );

  it('refuses a negative amount', () => {
    expect(() => Money.fromNumber(-1, 'AED')).toThrow(ValidationError);
  });

  it('refuses more than the Decimal(10,2) column can hold', () => {
    expect(() => Money.fromNumber(100_000_000, 'AED')).toThrow(ValidationError);
  });
});

describe('Money.toDecimalString', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [50, '0.50'],
    [100, '1.00'],
    [9_999_999_999, '99999999.99'],
  ])('renders %i minor units as "%s"', (minorUnits, expected) => {
    expect(Money.fromMinorUnits(minorUnits, 'AED').toDecimalString()).toBe(
      expected,
    );
  });
});

describe('Money', () => {
  it('is not equal across currencies, however equal the amount', () => {
    const dirhams = Money.fromMinorUnits(1999, 'AED');
    const riyals = Money.fromMinorUnits(1999, 'SAR');

    expect(dirhams.equals(riyals)).toBe(false);
    expect(dirhams.equals(Money.fromMinorUnits(1999, 'AED'))).toBe(true);
  });

  it('refuses a fraction of a minor unit', () => {
    expect(() => Money.fromMinorUnits(19.5, 'AED')).toThrow(ValidationError);
  });

  it('refuses a currency the storefront cannot render', () => {
    // The cast is the point of the test: this is what an unvalidated database row looks
    // like arriving at the boundary, and the constructor is what refuses it.
    const unsupported = 'GBP' as 'AED';

    expect(() => Money.fromMinorUnits(1999, unsupported)).toThrow(
      ValidationError,
    );
  });
});
