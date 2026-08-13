import {
  type Currency,
  CurrencySchema,
  MoneyStringSchema,
} from '@dukkanify/contracts';
import { ensure, parseOrThrow } from '../invariants';

/** `Decimal(10, 2)` in PostgreSQL: eight digits before the point, two after. */
const MINOR_UNITS_PER_UNIT = 100;
const MAX_MINOR_UNITS = 9_999_999_999;

/**
 * An amount of money, held as a whole number of minor units.
 *
 * CLAUDE.md says money is never a `number`, and the rule means never a *fractional* binary
 * float: 19.99 has no exact double representation, so arithmetic on it drifts. An integer
 * count of fils is exact, and the largest amount the column can hold — 9,999,999,999 minor
 * units — is three orders of magnitude below `Number.MAX_SAFE_INTEGER`.
 *
 * The alternative the plan offered was `decimal.js`, on the grounds that Prisma already
 * depends on it. Prisma 7 does not — it ships its own `Decimal` and pulls in nothing — so
 * that route now means adding a dependency to the one layer that is meant to import
 * nothing. Two integers and a `padStart` is the smaller correct answer.
 *
 * The currency travels with the amount so a price cannot be rendered under the wrong one.
 * There is deliberately no arithmetic here: nothing in this product adds two prices
 * together, and an unused `add` is an untested `add`.
 */
export class Money {
  private constructor(
    readonly minorUnits: number,
    readonly currency: Currency,
  ) {}

  static fromMinorUnits(minorUnits: number, currency: Currency): Money {
    ensure(
      Number.isSafeInteger(minorUnits),
      `A money amount must be a whole number of minor units, received ${minorUnits}.`,
    );
    ensure(minorUnits >= 0, 'A money amount cannot be negative.');
    ensure(
      minorUnits <= MAX_MINOR_UNITS,
      `A money amount cannot exceed ${MAX_MINOR_UNITS} minor units.`,
    );
    return new Money(
      minorUnits,
      parseOrThrow(CurrencySchema, currency, 'currency'),
    );
  }

  /** The database and the API both speak fixed-point strings, so this is the exact path. */
  static fromDecimalString(amount: string, currency: Currency): Money {
    const validated = parseOrThrow(MoneyStringSchema, amount, 'price');
    const [units = '0', fraction = '00'] = validated.split('.');
    return Money.fromMinorUnits(
      Number(units) * MINOR_UNITS_PER_UNIT + Number(fraction),
      currency,
    );
  }

  /**
   * The lossy path, used once: a generated blueprint carries prices as JSON numbers.
   *
   * Rounding happens here so it happens in one place — this is the "clamp prices to 2dp"
   * step of architecture.md §7. What is rounded is the value the double actually holds, not
   * the decimal someone meant to write, because by the time it is a `number` the difference
   * is already gone.
   */
  static fromNumber(amount: number, currency: Currency): Money {
    ensure(
      Number.isFinite(amount),
      `A price must be a finite number, received ${amount}.`,
    );
    return Money.fromMinorUnits(
      Math.round(amount * MINOR_UNITS_PER_UNIT),
      currency,
    );
  }

  /** Always two decimal places: "249.00", never "249" and never "249.0". */
  toDecimalString(): string {
    const units = Math.trunc(this.minorUnits / MINOR_UNITS_PER_UNIT);
    const fraction = this.minorUnits % MINOR_UNITS_PER_UNIT;
    return `${units}.${String(fraction).padStart(2, '0')}`;
  }

  get isPositive(): boolean {
    return this.minorUnits > 0;
  }

  equals(other: Money): boolean {
    return (
      this.minorUnits === other.minorUnits && this.currency === other.currency
    );
  }
}
