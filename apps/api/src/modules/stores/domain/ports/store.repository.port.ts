import type { Locale, StoreStatus } from '@dukkanify/contracts';
import type { Section } from '../entities/section.entity';
import type { Store } from '../entities/store.entity';
import type { Slug } from '../value-objects/slug.vo';

/**
 * What a dashboard card needs, and nothing else.
 *
 * Listing stores through `Store` would mean loading every page, section and product to
 * render a name and a date. `direction` is absent because it follows the locale, so the
 * projection carries no field that could disagree with another.
 */
export interface StoreSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: Slug;
  readonly tagline: string | null;
  readonly status: StoreStatus;
  readonly locale: Locale;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * The database as the domain sees it: aggregates in, aggregates out.
 *
 * Owned by `domain/` and implemented in `infrastructure/`, which is what lets a use case be
 * tested against an in-memory fake with no PostgreSQL anywhere (architecture.md §13). Note
 * what is *not* here: nothing takes an `ownerId` to filter by. A repository that quietly
 * scoped reads to an owner would answer "not found" for someone else's store, and §8 wants
 * that to be a 403 decided in the use case, on a store it can see the owner of.
 */
export interface StoreRepositoryPort {
  /** Persists a whole aggregate in one transaction, returning it as stored. */
  save(store: Store): Promise<Store>;

  findById(storeId: string): Promise<Store | null>;

  /** The public storefront route, which knows a slug and no user. */
  findBySlug(slug: Slug): Promise<Store | null>;

  listByOwner(ownerId: string): Promise<readonly StoreSummary[]>;

  /**
   * Whether a slug is taken. Store slugs are globally unique, so the generator has to ask
   * before it can settle on one — the database is the only thing that knows.
   */
  existsBySlug(slug: Slug): Promise<boolean>;

  /**
   * The inline editor's write path. A single section rather than the aggregate, because
   * rewriting an entire store to change one headline is a transaction nobody needs.
   */
  saveSection(storeId: string, section: Section): Promise<void>;

  /**
   * Removes the store and every child row. Ownership is decided before this is called;
   * the repository deletes by id so a missed check cannot hide as "not found".
   */
  delete(storeId: string): Promise<void>;
}

export const STORE_REPOSITORY = Symbol('StoreRepositoryPort');
