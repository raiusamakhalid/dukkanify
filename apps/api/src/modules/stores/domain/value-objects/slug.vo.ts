import { SlugSchema } from '@dukkanify/contracts';
import { ensure, parseOrThrow } from '../invariants';

/** The database column is `varchar`; the contract caps a slug at 64 characters. */
const MAX_LENGTH = 64;

/**
 * A URL-safe identifier, normalised once and valid by construction.
 *
 * A class rather than a `string` alias because both jobs a slug has — deriving one from a
 * store name and accepting one that already exists — must produce the same thing, and a
 * bare string lets the second skip the first. Once you hold a `Slug`, it has been checked.
 */
export class Slug {
  private constructor(readonly value: string) {}

  /** For a slug that should already be canonical: a stored one, or a generated one. */
  static create(value: string): Slug {
    return new Slug(parseOrThrow(SlugSchema, value, 'slug'));
  }

  /**
   * Derives a slug from human text: "Oud & Attar" becomes "oud-attar".
   *
   * Latin diacritics are folded rather than dropped, so "Café" stays "cafe".
   */
  static fromText(text: string): Slug {
    const slug = Slug.tryFromText(text);
    ensure(
      slug !== null,
      `"${text}" contains no characters a URL slug can be made from.`,
    );
    return slug;
  }

  /**
   * The same derivation, answering `null` instead of throwing.
   *
   * Scripts with no ASCII form — Arabic above all, which this product is built for —
   * normalise to nothing. What a store called "عطور فاخرة" should live at is a product
   * decision belonging to the caller, and a caller that has a fallback ready should not have
   * to catch an exception to use it.
   */
  static tryFromText(text: string): Slug | null {
    const normalised = text
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_LENGTH)
      .replace(/-+$/, '');

    return normalised.length === 0 ? null : Slug.create(normalised);
  }

  /**
   * A variant of this slug that fits the column: "oud-attar" + "2" becomes "oud-attar-2".
   * The base is trimmed from the end when the suffix would push it past the limit, so a
   * long store name still yields a valid slug rather than a rejected one.
   */
  withSuffix(suffix: string): Slug {
    const room = MAX_LENGTH - suffix.length - 1;
    const base = this.value.slice(0, room).replace(/-+$/, '');
    return Slug.create(`${base}-${suffix}`);
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
