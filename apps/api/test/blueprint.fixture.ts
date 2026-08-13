import type { StoreBlueprint, ThemeTokens } from '@dukkanify/contracts';

/**
 * A storefront the contract accepts, written once for every test that needs one.
 *
 * Copied per spec file it would drift, and a suite whose fixtures disagree about what a
 * valid store is has stopped testing the contract and started testing itself. Kept free of
 * anything but `@dukkanify/contracts` on purpose: the domain specs import it, and the whole
 * claim of architecture.md §3 is that they need no framework to run.
 *
 * The generation specs take their blueprint from `MockGenerator` instead — see
 * `mockBlueprint` in `test/scripted-generator.ts`. There, the adapter's own output is the
 * honest starting point, because a real provider is what those tests stand in for.
 */

/** The prompt this repository demonstrates itself with, from the PDF's own example. */
export const PROMPT = 'Create a luxury perfume store for UAE customers';

export const THEME: ThemeTokens = {
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

/**
 * The same store under whatever name a test needs, because the rules about names — a second
 * store called the same thing, a name that yields no slug — are rules about one field.
 */
export function blueprintFor(name: string): StoreBlueprint {
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
      // Three decimal places on purpose: a generated price is clamped on the way in, and
      // the test that proves it should not have to build its own blueprint to do so.
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
