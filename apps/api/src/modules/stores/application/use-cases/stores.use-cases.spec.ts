import type { StoreBlueprint, ThemeTokens } from '@dukkanify/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../common/errors/domain.error';
import type { Section } from '../../domain/entities/section.entity';
import type { Store } from '../../domain/entities/store.entity';
import type {
  StoreRepositoryPort,
  StoreSummary,
} from '../../domain/ports/store.repository.port';
import type { Slug } from '../../domain/value-objects/slug.vo';
import { GetStoreUseCase } from './get-store.use-case';
import { GetStorefrontUseCase } from './get-storefront.use-case';
import { ListStoresUseCase } from './list-stores.use-case';
import { SaveStoreUseCase } from './save-store.use-case';
import { UpdateSectionUseCase } from './update-section.use-case';

/**
 * The whole application layer, with the database replaced by a Map.
 *
 * This is the payoff of the port: no PostgreSQL, no Nest container, no network — the rules
 * these tests are about (who may read a store, what a 404 means versus a 403) are decided
 * in the use cases, so that is where they can be checked.
 */
class InMemoryStores implements StoreRepositoryPort {
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
}

const THEME: ThemeTokens = {
  colors: {
    primary: '#8A6D3B',
    secondary: '#3A2C14',
    accent: '#C8A24A',
    background: '#F6E7C1',
    foreground: '#1B120B',
    muted: '#9C8A6A',
  },
  fonts: { display: 'ibm-plex-sans-arabic', body: 'source-serif-4' },
  radius: '0.75rem',
  spacing: 'generous',
};

function blueprintFor(name: string): StoreBlueprint {
  return {
    store: {
      name,
      tagline: 'Aged oud from Sharjah',
      locale: 'en',
      currency: 'AED',
    },
    theme: THEME,
    categories: [
      { name: 'Attar', slug: 'attar' },
      { name: 'Bukhoor', slug: 'bukhoor' },
    ],
    products: Array.from({ length: 8 }, (_unused, index) => ({
      name: `Product ${index + 1}`,
      description: 'A twelve-hour maceration of Cambodian oud and Taif rose.',
      price: 249.567,
      sku: `OUD-ROYAL-0${index + 1}`,
      categorySlug: index % 2 === 0 ? 'attar' : 'bukhoor',
    })),
    pages: [
      {
        type: 'HOME',
        title: 'Home',
        slug: 'home',
        sections: [
          {
            type: 'HERO',
            headline: 'Oud, aged the long way',
            subheadline: 'Blended in Sharjah, bottled in small batches.',
            ctaLabel: 'Shop the collection',
            ctaHref: '#products',
          },
        ],
      },
      {
        type: 'ABOUT',
        title: 'Our story',
        slug: 'about',
        sections: [
          {
            type: 'RICH_TEXT',
            heading: 'Our story',
            paragraphs: ['Founded in Sharjah in 1998.'],
          },
        ],
      },
      {
        type: 'CONTACT',
        title: 'Visit us',
        slug: 'contact',
        sections: [
          {
            type: 'CONTACT',
            heading: 'Visit us',
            email: 'salam@dukkan.ae',
            phone: '+971 4 504 4058',
            addressLines: ['Al Wasl Road, Dubai'],
          },
        ],
      },
    ],
  };
}

const OWNER = 'user-1';
const INTRUDER = 'user-2';

let stores: InMemoryStores;
let save: SaveStoreUseCase;

async function seedStore(
  name = 'Dukkan Al Oud',
  ownerId = OWNER,
): Promise<Store> {
  return save.execute({
    ownerId,
    prompt: 'Create a luxury perfume store for UAE customers',
    promptVersion: 'test.1',
    blueprint: blueprintFor(name),
  });
}

beforeEach(() => {
  stores = new InMemoryStores();
  save = new SaveStoreUseCase(stores);
});

describe('SaveStoreUseCase', () => {
  it('turns a blueprint into a persisted store with server-assigned ids', async () => {
    const store = await seedStore();

    expect(store.id).not.toBe('');
    expect(store.slug.value).toBe('dukkan-al-oud');
    expect(store.products).toHaveLength(8);
    expect(store.pages.map((page) => page.type)).toEqual([
      'HOME',
      'ABOUT',
      'CONTACT',
    ]);
  });

  it('clamps generated prices to two decimal places', async () => {
    const store = await seedStore();

    expect(store.products[0]?.price.toDecimalString()).toBe('249.57');
  });

  it('resolves each product onto a real category of its own store', async () => {
    const store = await seedStore();
    const categoryIds = new Set(
      store.categories.map((category) => category.id),
    );

    expect(
      store.products.every(
        (product) =>
          product.categoryId !== null && categoryIds.has(product.categoryId),
      ),
    ).toBe(true);
  });

  it('gives the second store of the same name a different address', async () => {
    await seedStore();

    const second = await seedStore();

    expect(second.slug.value).toBe('dukkan-al-oud-2');
  });

  it('falls back to a usable address when the name yields no slug', async () => {
    const store = await save.execute({
      ownerId: OWNER,
      prompt: 'متجر عطور فاخر لعملاء الإمارات',
      promptVersion: 'test.1',
      blueprint: blueprintFor('عطور فاخرة'),
    });

    expect(store.slug.value).toBe('store');
  });

  it('keeps the original address when a store is replaced', async () => {
    const original = await seedStore();

    const replaced = await save.execute({
      ownerId: OWNER,
      storeId: original.id,
      prompt: 'Create a luxury perfume store for UAE customers',
      promptVersion: 'test.2',
      blueprint: blueprintFor('A Completely Different Name'),
    });

    expect(replaced.id).toBe(original.id);
    expect(replaced.slug.value).toBe('dukkan-al-oud');
    expect(replaced.name).toBe('A Completely Different Name');
    expect(replaced.createdAt).toEqual(original.createdAt);
  });

  it('refuses to replace a store belonging to someone else', async () => {
    const original = await seedStore();

    await expect(
      save.execute({
        ownerId: INTRUDER,
        storeId: original.id,
        prompt: 'Create a luxury perfume store for UAE customers',
        promptVersion: 'test.2',
        blueprint: blueprintFor('Hijacked'),
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('GetStoreUseCase', () => {
  it('returns a store to its owner', async () => {
    const seeded = await seedStore();

    const store = await new GetStoreUseCase(stores).execute({
      storeId: seeded.id,
      requesterId: OWNER,
    });

    expect(store.id).toBe(seeded.id);
  });

  it('answers 403, not 404, for a store that exists but belongs to another account', async () => {
    const seeded = await seedStore();

    await expect(
      new GetStoreUseCase(stores).execute({
        storeId: seeded.id,
        requesterId: INTRUDER,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('answers 404 for a store that does not exist', async () => {
    await expect(
      new GetStoreUseCase(stores).execute({
        storeId: 'nothing-here',
        requesterId: OWNER,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('ListStoresUseCase', () => {
  it("returns only the caller's stores", async () => {
    await seedStore('Dukkan Al Oud', OWNER);
    await seedStore('Someone Elses Shop', INTRUDER);

    const mine = await new ListStoresUseCase(stores).execute({
      ownerId: OWNER,
    });

    expect(mine).toHaveLength(1);
    expect(mine[0]?.name).toBe('Dukkan Al Oud');
  });
});

describe('GetStorefrontUseCase', () => {
  it('serves a store by slug with no signed-in user at all', async () => {
    const seeded = await seedStore();

    const store = await new GetStorefrontUseCase(stores).execute({
      slug: 'dukkan-al-oud',
    });

    expect(store.id).toBe(seeded.id);
  });

  it('answers 404 for a slug nobody has taken', async () => {
    await expect(
      new GetStorefrontUseCase(stores).execute({ slug: 'no-such-store' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('refuses a malformed slug before it reaches the database', async () => {
    await expect(
      new GetStorefrontUseCase(stores).execute({ slug: 'Not A Slug' }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('UpdateSectionUseCase', () => {
  const editedHero = {
    type: 'HERO',
    headline: 'Oud, aged longer',
    subheadline: 'Blended in Sharjah, bottled in small batches.',
    ctaLabel: 'Shop the collection',
    ctaHref: '#products',
  };

  it('writes the new content and reports where the section sits', async () => {
    const seeded = await seedStore();
    const heroId = seeded.pages[0]?.sections[0]?.id ?? '';

    const located = await new UpdateSectionUseCase(stores).execute({
      storeId: seeded.id,
      sectionId: heroId,
      requesterId: OWNER,
      content: editedHero,
    });

    expect(located.position).toBe(0);
    expect(located.section.content).toMatchObject({
      headline: 'Oud, aged longer',
    });
    expect(stores.savedSections).toHaveLength(1);
  });

  it('refuses an edit from someone who does not own the store', async () => {
    const seeded = await seedStore();
    const heroId = seeded.pages[0]?.sections[0]?.id ?? '';

    await expect(
      new UpdateSectionUseCase(stores).execute({
        storeId: seeded.id,
        sectionId: heroId,
        requesterId: INTRUDER,
        content: editedHero,
      }),
    ).rejects.toThrow(ForbiddenError);
    expect(stores.savedSections).toHaveLength(0);
  });

  it('refuses a section id that belongs to a different store', async () => {
    const mine = await seedStore('Dukkan Al Oud', OWNER);
    const theirs = await seedStore('Someone Elses Shop', INTRUDER);
    const theirHeroId = theirs.pages[0]?.sections[0]?.id ?? '';

    await expect(
      new UpdateSectionUseCase(stores).execute({
        storeId: mine.id,
        sectionId: theirHeroId,
        requesterId: OWNER,
        content: editedHero,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('refuses content that would change what kind of section it is', async () => {
    const seeded = await seedStore();
    const heroId = seeded.pages[0]?.sections[0]?.id ?? '';

    await expect(
      new UpdateSectionUseCase(stores).execute({
        storeId: seeded.id,
        sectionId: heroId,
        requesterId: OWNER,
        content: {
          type: 'RICH_TEXT',
          heading: 'Our story',
          paragraphs: ['Founded in 1998.'],
        },
      }),
    ).rejects.toThrow(ValidationError);
  });
});
