import {
  type Direction,
  type Locale,
  LocaleSchema,
  MAX_PROMPT_LENGTH,
  PAGE_TYPES,
  type StoreStatus,
  StoreStatusSchema,
  type ThemeTokens,
  ThemeTokensSchema,
  directionForLocale,
  text,
} from '@dukkanify/contracts';
import { ensure, parseOrThrow } from '../invariants';
import type { Slug } from '../value-objects/slug.vo';
import type { Page, SectionLocation } from './page.entity';
import type { Product } from './product.entity';

const StoreNameSchema = text(60);
const TaglineSchema = text(140);
const CategoryNameSchema = text(60);
const PromptSchema = text(MAX_PROMPT_LENGTH);

export interface CategoryProps {
  id: string;
  name: string;
  slug: Slug;
}

/**
 * A grouping of products, defined here rather than in a file of its own because it is the
 * one child of the aggregate with no behaviour and no meaning outside it: a category
 * belongs to exactly one store, and the rules about it — unique slugs, products that
 * reference a real one — are the store's rules, enforced below.
 */
export class Category {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: Slug,
  ) {}

  static create(props: CategoryProps): Category {
    ensure(props.id.length > 0, 'A category needs an id.');
    return new Category(
      props.id,
      parseOrThrow(CategoryNameSchema, props.name, 'name'),
      props.slug,
    );
  }
}

export interface StoreProps {
  id: string;
  ownerId: string;
  name: string;
  slug: Slug;
  tagline: string | null;
  /** The natural-language request this store was generated from. */
  prompt: string;
  promptVersion: string;
  status: StoreStatus;
  locale: Locale;
  theme: unknown;
  categories: readonly Category[];
  products: readonly Product[];
  pages: readonly Page[];
  /** Omitted for an aggregate that has not been saved yet; the database is authoritative. */
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A generated storefront, whole: its theme, its catalogue and its pages.
 *
 * This is the aggregate root, and the reason the rules below live here rather than in a use
 * case is that they are true of every store however it was made — generated, edited, or
 * read back from the database years from now. A use case can forget a check; a constructor
 * that refuses to return cannot.
 *
 * Ids are supplied by the caller rather than invented here. The database generates them for
 * rows it creates, so an aggregate assembled before its first save takes ids from the layer
 * that is about to write it — the domain has no business knowing what a cuid is.
 */
export class Store {
  private constructor(
    readonly id: string,
    readonly ownerId: string,
    readonly name: string,
    readonly slug: Slug,
    readonly tagline: string | null,
    readonly prompt: string,
    readonly promptVersion: string,
    readonly status: StoreStatus,
    readonly locale: Locale,
    readonly theme: ThemeTokens,
    readonly categories: readonly Category[],
    readonly products: readonly Product[],
    readonly pages: readonly Page[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(props: StoreProps): Store {
    ensure(props.id.length > 0, 'A store needs an id.');
    ensure(props.ownerId.length > 0, 'A store needs an owner.');
    ensure(props.promptVersion.length > 0, 'A store needs a prompt version.');

    requireEveryPageTypeOnce(props.pages);
    requireDistinctCategorySlugs(props.categories);
    requireDistinctSkus(props.products);
    requireKnownCategories(props.categories, props.products);
    requireOneCurrency(props.products);

    const now = new Date();
    return new Store(
      props.id,
      props.ownerId,
      parseOrThrow(StoreNameSchema, props.name, 'name'),
      props.slug,
      props.tagline === null
        ? null
        : parseOrThrow(TaglineSchema, props.tagline, 'tagline'),
      parseOrThrow(PromptSchema, props.prompt, 'prompt'),
      props.promptVersion,
      parseOrThrow(StoreStatusSchema, props.status, 'status'),
      parseOrThrow(LocaleSchema, props.locale, 'locale'),
      parseOrThrow(ThemeTokensSchema, props.theme, 'theme'),
      [...props.categories],
      [...props.products],
      [...props.pages],
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  /**
   * Derived, never stored twice. An Arabic store is right-to-left because it is Arabic, so
   * there is no state in which the two could be edited apart.
   */
  get direction(): Direction {
    return directionForLocale(this.locale);
  }

  /**
   * Ownership as a question the store answers, so the use case reads as the rule it is
   * enforcing (architecture.md §8) instead of comparing two strings and hoping.
   */
  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  /**
   * The one way a store changes lifecycle. Publish and unpublish are the same write with a
   * different target, so the conditions that gate each direction live here rather than in
   * two use cases that would drift.
   *
   * Going live requires a catalogue: a published shop with no products is a shop a customer
   * cannot buy from. Returning to draft is always allowed — that is how a live shop is
   * taken down without deleting it.
   */
  withStatus(status: StoreStatus): Store {
    if (status === this.status) {
      return this;
    }

    ensure(
      status !== 'PUBLISHED' || this.products.length > 0,
      'A store needs at least one product before it can be published.',
    );

    return Store.create({
      id: this.id,
      ownerId: this.ownerId,
      name: this.name,
      slug: this.slug,
      tagline: this.tagline,
      prompt: this.prompt,
      promptVersion: this.promptVersion,
      status,
      locale: this.locale,
      theme: this.theme,
      categories: this.categories,
      products: this.products,
      pages: this.pages,
      createdAt: this.createdAt,
    });
  }

  /** The section with this id anywhere in the store, or null if it belongs to another. */
  findSection(sectionId: string): SectionLocation | null {
    for (const page of this.pages) {
      const located = page.findSection(sectionId);
      if (located !== null) {
        return located;
      }
    }
    return null;
  }
}

/**
 * Three pages, one of each type — the shape every generated store is contracted to have.
 *
 * Counting per type is the whole check: a page's type is validated on the way in, so three
 * counts of one leaves no room for a fourth page. A separate length assertion would read
 * like a second rule and could never fire.
 */
function requireEveryPageTypeOnce(pages: readonly Page[]): void {
  for (const pageType of PAGE_TYPES) {
    const count = pages.filter((page) => page.type === pageType).length;
    ensure(
      count === 1,
      `A store has exactly one ${pageType} page, this one has ${count}.`,
    );
  }
}

function requireDistinctCategorySlugs(categories: readonly Category[]): void {
  const seen = new Set<string>();
  for (const category of categories) {
    ensure(
      !seen.has(category.slug.value),
      `Two categories share the slug "${category.slug.value}", so one of them is unreachable.`,
    );
    seen.add(category.slug.value);
  }
}

/** Unique per store, not globally — the `@@unique([storeId, sku])` in §6. */
function requireDistinctSkus(products: readonly Product[]): void {
  const seen = new Set<string>();
  for (const product of products) {
    ensure(
      !seen.has(product.sku),
      `Two products share the SKU "${product.sku}".`,
    );
    seen.add(product.sku);
  }
}

function requireKnownCategories(
  categories: readonly Category[],
  products: readonly Product[],
): void {
  const ids = new Set(categories.map((category) => category.id));
  for (const product of products) {
    ensure(
      product.categoryId === null || ids.has(product.categoryId),
      `Product "${product.name}" is filed under a category that is not part of this store.`,
    );
  }
}

/** One store, one currency: a catalogue priced in two is a catalogue nobody can total. */
function requireOneCurrency(products: readonly Product[]): void {
  const [first] = products;
  if (first === undefined) {
    return;
  }
  for (const product of products) {
    ensure(
      product.price.currency === first.price.currency,
      `Product "${product.name}" is priced in ${product.price.currency} while the rest of the store is in ${first.price.currency}.`,
    );
  }
}
