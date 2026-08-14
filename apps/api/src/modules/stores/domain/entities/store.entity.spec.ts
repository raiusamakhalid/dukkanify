import type { PageType } from '@dukkanify/contracts';
import { describe, expect, it } from 'vitest';
import { PROMPT, THEME } from '../../../../../test/blueprint.fixture';
import { ValidationError } from '../../../../common/errors/domain.error';
import { Money } from '../value-objects/money.vo';
import { Slug } from '../value-objects/slug.vo';
import { Page } from './page.entity';
import { Product } from './product.entity';
import { Section } from './section.entity';
import { Category, Store, type StoreProps } from './store.entity';

const SECTION_CONTENT = {
  HOME: {
    type: 'HERO',
    headline: 'Oud, aged the long way',
    subheadline: 'Blended in Sharjah, bottled in small batches.',
    ctaLabel: 'Shop the collection',
  },
  ABOUT: {
    type: 'RICH_TEXT',
    heading: 'Our story',
    paragraphs: ['Founded in Sharjah in 1998.'],
  },
  CONTACT: {
    type: 'CONTACT',
    heading: 'Visit us',
    email: 'salam@dukkan.ae',
    phone: '+971 4 504 4058',
    addressLines: ['Al Wasl Road, Dubai'],
  },
  // `unknown` values on purpose: this is what a `Json` column hands the entity, and the
  // entity parsing it is the behaviour under test.
} as const satisfies Record<PageType, unknown>;

function page(type: PageType, slug: string): Page {
  return Page.create({
    id: `page-${type.toLowerCase()}`,
    type,
    title: type === 'HOME' ? 'Home' : slug,
    slug: Slug.create(slug),
    sections: [
      Section.create({
        id: `sec-${type.toLowerCase()}`,
        content: SECTION_CONTENT[type],
      }),
    ],
  });
}

function category(id: string, slug: string): Category {
  return Category.create({ id, name: slug, slug: Slug.create(slug) });
}

function product(
  id: string,
  sku: string,
  categoryId: string | null,
  price = Money.fromDecimalString('249.00', 'AED'),
): Product {
  return Product.create({
    id,
    categoryId,
    name: `Product ${id}`,
    description: 'A twelve-hour maceration of Cambodian oud and Taif rose.',
    price,
    sku,
    imageUrl: null,
  });
}

function storeWith(overrides: Partial<StoreProps> = {}): StoreProps {
  return {
    id: 'store-1',
    ownerId: 'user-1',
    name: 'Dukkan Al Oud',
    slug: Slug.create('dukkan-al-oud'),
    tagline: 'Aged oud from Sharjah',
    prompt: PROMPT,
    promptVersion: '2026-08-13.1',
    status: 'DRAFT',
    locale: 'en',
    theme: THEME,
    categories: [category('cat-1', 'attar'), category('cat-2', 'bukhoor')],
    products: [
      product('prod-1', 'OUD-ROYAL-01', 'cat-1'),
      product('prod-2', 'BUK-SMOKE-02', 'cat-2'),
    ],
    pages: [
      page('HOME', 'home'),
      page('ABOUT', 'about'),
      page('CONTACT', 'contact'),
    ],
    ...overrides,
  };
}

describe('Store.create', () => {
  it('assembles a whole storefront', () => {
    const store = Store.create(storeWith());

    expect(store.slug.value).toBe('dukkan-al-oud');
    expect(store.pages).toHaveLength(3);
    expect(store.products).toHaveLength(2);
  });

  it('stamps timestamps for an aggregate that has never been saved', () => {
    const store = Store.create(storeWith());

    expect(store.createdAt).toBeInstanceOf(Date);
    expect(store.updatedAt).toBeInstanceOf(Date);
  });

  it('keeps the timestamps a stored store was read back with', () => {
    const createdAt = new Date('2026-08-01T09:00:00.000Z');
    const store = Store.create(storeWith({ createdAt, updatedAt: createdAt }));

    expect(store.createdAt).toEqual(createdAt);
  });

  it('refuses a store with no owner, which nobody could ever reach', () => {
    expect(() => Store.create(storeWith({ ownerId: '' }))).toThrow(
      ValidationError,
    );
  });

  it('refuses a prompt longer than the generator accepts', () => {
    expect(() => Store.create(storeWith({ prompt: 'a'.repeat(501) }))).toThrow(
      ValidationError,
    );
  });

  it('refuses a theme the storefront could not render', () => {
    const broken = { ...THEME, colors: { ...THEME.colors, primary: 'gold' } };

    expect(() => Store.create(storeWith({ theme: broken }))).toThrow(
      ValidationError,
    );
  });
});

describe('Store page invariants', () => {
  it('refuses a store missing one of the three pages', () => {
    expect(() =>
      Store.create(
        storeWith({ pages: [page('HOME', 'home'), page('ABOUT', 'about')] }),
      ),
    ).toThrow(/exactly one CONTACT page/);
  });

  it('refuses two pages of the same type', () => {
    expect(() =>
      Store.create(
        storeWith({
          pages: [
            page('HOME', 'home'),
            page('ABOUT', 'about'),
            page('ABOUT', 'about-us'),
            page('CONTACT', 'contact'),
          ],
        }),
      ),
    ).toThrow(/exactly one ABOUT page/);
  });
});

describe('Store catalogue invariants', () => {
  it('refuses two categories that would share a URL', () => {
    expect(() =>
      Store.create(
        storeWith({
          categories: [category('cat-1', 'attar'), category('cat-2', 'attar')],
        }),
      ),
    ).toThrow(/share the slug "attar"/);
  });

  it('refuses two products with the same SKU', () => {
    expect(() =>
      Store.create(
        storeWith({
          products: [
            product('prod-1', 'OUD-ROYAL-01', 'cat-1'),
            product('prod-2', 'OUD-ROYAL-01', 'cat-2'),
          ],
        }),
      ),
    ).toThrow(/share the SKU/);
  });

  it('refuses a product filed under a category from some other store', () => {
    expect(() =>
      Store.create(
        storeWith({
          products: [product('prod-1', 'OUD-ROYAL-01', 'cat-elsewhere')],
        }),
      ),
    ).toThrow(/not part of this store/);
  });

  it('accepts a product with no category at all', () => {
    const store = Store.create(
      storeWith({ products: [product('prod-1', 'OUD-ROYAL-01', null)] }),
    );

    expect(store.products[0]?.categoryId).toBe(null);
  });

  it('refuses a catalogue priced in two currencies', () => {
    expect(() =>
      Store.create(
        storeWith({
          products: [
            product('prod-1', 'OUD-ROYAL-01', 'cat-1'),
            product(
              'prod-2',
              'BUK-SMOKE-02',
              'cat-2',
              Money.fromDecimalString('99.00', 'SAR'),
            ),
          ],
        }),
      ),
    ).toThrow(/SAR/);
  });
});

describe('Store behaviour', () => {
  it('reads right-to-left because it is Arabic, not because a column says so', () => {
    expect(Store.create(storeWith({ locale: 'ar' })).direction).toBe('RTL');
    expect(Store.create(storeWith({ locale: 'en' })).direction).toBe('LTR');
  });

  it('answers who owns it', () => {
    const store = Store.create(storeWith());

    expect(store.isOwnedBy('user-1')).toBe(true);
    expect(store.isOwnedBy('user-2')).toBe(false);
  });

  it('finds a section on any of its pages', () => {
    const store = Store.create(storeWith());

    expect(store.findSection('sec-contact')?.section.type).toBe('CONTACT');
  });

  it('does not find a section belonging to another store', () => {
    expect(Store.create(storeWith()).findSection('sec-elsewhere')).toBe(null);
  });

  it('publishes a store that has a catalogue', () => {
    const store = Store.create(storeWith()).withStatus('PUBLISHED');

    expect(store.status).toBe('PUBLISHED');
  });

  it('returns the same instance when the status does not change', () => {
    const store = Store.create(storeWith());

    expect(store.withStatus('DRAFT')).toBe(store);
  });

  it('returns a published store to draft', () => {
    const store = Store.create(storeWith())
      .withStatus('PUBLISHED')
      .withStatus('DRAFT');

    expect(store.status).toBe('DRAFT');
  });

  it('refuses to publish a store with no products', () => {
    expect(() =>
      Store.create(storeWith({ products: [] })).withStatus('PUBLISHED'),
    ).toThrow(/at least one product/);
  });
});
