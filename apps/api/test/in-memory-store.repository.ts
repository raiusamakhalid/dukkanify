import type { Section } from '../src/modules/stores/domain/entities/section.entity';
import type { Store } from '../src/modules/stores/domain/entities/store.entity';
import type {
  StoreRepositoryPort,
  StoreSummary,
} from '../src/modules/stores/domain/ports/store.repository.port';
import type { Slug } from '../src/modules/stores/domain/value-objects/slug.vo';

/**
 * The store repository, with PostgreSQL replaced by a Map.
 *
 * This is the payoff of the port (architecture.md §3): the rules the application layer owns
 * — who may read a store, what a 404 means versus a 403, what a generated blueprint becomes
 * once it is persisted — are decided in use cases, so they can be checked with no database,
 * no network and no Nest container. `npm run test -w api` needs nothing running.
 *
 * It lives outside `src/` because it is not shipped: `tsconfig.build.json` excludes `test/`,
 * so a test double can never be bundled into `dist/`.
 */
export class InMemoryStores implements StoreRepositoryPort {
  readonly rows = new Map<string, Store>();
  savedSections: Array<{ storeId: string; section: Section }> = [];

  save(store: Store): Promise<Store> {
    this.rows.set(store.id, store);
    return Promise.resolve(store);
  }

  findById(storeId: string): Promise<Store | null> {
    return Promise.resolve(this.rows.get(storeId) ?? null);
  }

  findBySlug(slug: Slug): Promise<Store | null> {
    const match = [...this.rows.values()].find((store) =>
      store.slug.equals(slug),
    );
    return Promise.resolve(match ?? null);
  }

  listByOwner(ownerId: string): Promise<readonly StoreSummary[]> {
    return Promise.resolve(
      [...this.rows.values()].filter((store) => store.isOwnedBy(ownerId)),
    );
  }

  existsBySlug(slug: Slug): Promise<boolean> {
    return Promise.resolve(
      [...this.rows.values()].some((store) => store.slug.equals(slug)),
    );
  }

  saveSection(storeId: string, section: Section): Promise<void> {
    this.savedSections.push({ storeId, section });
    return Promise.resolve();
  }

  delete(storeId: string): Promise<void> {
    this.rows.delete(storeId);
    return Promise.resolve();
  }
}
