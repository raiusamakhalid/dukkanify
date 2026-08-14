import { beforeEach, describe, expect, it } from 'vitest';
import { PROMPT, blueprintFor } from '../../../../../test/blueprint.fixture';
import { InMemoryStores } from '../../../../../test/in-memory-store.repository';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../common/errors/domain.error';
import type { Store } from '../../domain/entities/store.entity';
import { GetStoreUseCase } from './get-store.use-case';
import { GetStorefrontUseCase } from './get-storefront.use-case';
import { ListStoresUseCase } from './list-stores.use-case';
import { SaveStoreUseCase } from './save-store.use-case';
import { UpdateSectionUseCase } from './update-section.use-case';
import { UpdateStoreStatusUseCase } from './update-store-status.use-case';
import { DeleteStoreUseCase } from './delete-store.use-case';

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
    prompt: PROMPT,
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
      prompt: PROMPT,
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
        prompt: PROMPT,
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
  it('serves a published store by slug with no signed-in user at all', async () => {
    const seeded = await seedStore();
    await new UpdateStoreStatusUseCase(stores).execute({
      storeId: seeded.id,
      requesterId: OWNER,
      status: 'PUBLISHED',
    });

    const store = await new GetStorefrontUseCase(stores).execute({
      slug: 'dukkan-al-oud',
    });

    expect(store.id).toBe(seeded.id);
  });

  it('hides a draft behind 404 so a public URL cannot leak an unfinished shop', async () => {
    await seedStore();

    await expect(
      new GetStorefrontUseCase(stores).execute({ slug: 'dukkan-al-oud' }),
    ).rejects.toThrow(NotFoundError);
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

describe('UpdateStoreStatusUseCase', () => {
  it('publishes a store the caller owns', async () => {
    const seeded = await seedStore();

    const store = await new UpdateStoreStatusUseCase(stores).execute({
      storeId: seeded.id,
      requesterId: OWNER,
      status: 'PUBLISHED',
    });

    expect(store.status).toBe('PUBLISHED');
  });

  it('returns a published store to draft', async () => {
    const seeded = await seedStore();
    await new UpdateStoreStatusUseCase(stores).execute({
      storeId: seeded.id,
      requesterId: OWNER,
      status: 'PUBLISHED',
    });

    const store = await new UpdateStoreStatusUseCase(stores).execute({
      storeId: seeded.id,
      requesterId: OWNER,
      status: 'DRAFT',
    });

    expect(store.status).toBe('DRAFT');
  });

  it('refuses a status change from someone who does not own the store', async () => {
    const seeded = await seedStore();

    await expect(
      new UpdateStoreStatusUseCase(stores).execute({
        storeId: seeded.id,
        requesterId: INTRUDER,
        status: 'PUBLISHED',
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('DeleteStoreUseCase', () => {
  it('removes a store the caller owns', async () => {
    const seeded = await seedStore();

    const deleted = await new DeleteStoreUseCase(stores).execute({
      storeId: seeded.id,
      requesterId: OWNER,
    });

    expect(deleted.id).toBe(seeded.id);
    await expect(
      new GetStoreUseCase(stores).execute({
        storeId: seeded.id,
        requesterId: OWNER,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('refuses to delete a store belonging to someone else', async () => {
    const seeded = await seedStore();

    await expect(
      new DeleteStoreUseCase(stores).execute({
        storeId: seeded.id,
        requesterId: INTRUDER,
      }),
    ).rejects.toThrow(ForbiddenError);
    expect(stores.rows.has(seeded.id)).toBe(true);
  });
});
