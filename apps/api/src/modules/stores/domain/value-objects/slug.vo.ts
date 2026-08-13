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
   * Latin diacritics are folded rather than dropped, so "Café" stays "cafe". Scripts with no
   * ASCII form — Arabic above all, which this product is built for — normalise to nothing,
   * and that throws rather than returning an empty slug. Choosing a fallback is a product
   * decision, so it belongs to the caller that knows what the store is called.
   */
  static fromText(text: string): Slug {
    const normalised = text
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_LENGTH)
      .replace(/-+$/, '');

    ensure(
      normalised.length > 0,
      `"${text}" contains no characters a URL slug can be made from.`,
    );
    return Slug.create(normalised);
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
