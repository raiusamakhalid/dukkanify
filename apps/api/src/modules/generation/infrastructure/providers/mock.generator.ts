import { Injectable, Logger } from '@nestjs/common';
import type {
  Currency,
  StoreBlueprint,
  ThemeTokens,
} from '@dukkanify/contracts';
import type {
  AiGeneratorPort,
  BlueprintGenerationRequest,
  GeneratedBlueprint,
} from '../../domain/ports/ai-generator.port';
import { MOCK_PROMPT_VERSION } from '../prompts/prompt.version';

/**
 * A storefront designed the way the real one should be, chosen by keyword.
 *
 * Not a stub. It is a first-class adapter behind the same port (architecture.md §7), and it
 * is what makes the entire frontend developable offline at zero cost and the generation use
 * case testable with no network. Its copy is written to the same standard as the system
 * prompt asks for, because this is the output the product is demonstrated with.
 *
 * Deterministic: the same prompt always produces the same store. A mock that varied would
 * make every failure downstream unreproducible.
 */

interface CatalogueItem {
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly sku: string;
  readonly categorySlug: string;
}

interface StoreProfile {
  /** Matched case-insensitively against the prompt, first profile wins. */
  readonly keywords: readonly string[];
  readonly name: string;
  readonly tagline: string;
  readonly currency: Currency;
  readonly theme: ThemeTokens;
  readonly categories: readonly { name: string; slug: string }[];
  readonly items: readonly CatalogueItem[];
  readonly hero: {
    readonly headline: string;
    readonly subheadline: string;
    readonly ctaLabel: string;
  };
  readonly categoryHeading: string;
  readonly productHeading: string;
  readonly about: { readonly heading: string; readonly paragraphs: string[] };
  readonly contact: {
    readonly heading: string;
    readonly email: string;
    readonly phone: string;
    readonly addressLines: string[];
  };
}

/** Desert sand, deep oud brown and gold leaf — the palette the system prompt asks for. */
const OUD_THEME: ThemeTokens = {
  colors: {
    primary: '#6B4A2B',
    secondary: '#2E2116',
    accent: '#C8A24A',
    background: '#F6EFE2',
    foreground: '#1B120B',
    muted: '#8C7A62',
  },
  fonts: { display: 'ibm-plex-sans-arabic', body: 'source-serif-4' },
  radius: '0.5rem',
  spacing: 'generous',
};

const SMOKE_THEME: ThemeTokens = {
  colors: {
    primary: '#4A3520',
    secondary: '#1E1710',
    accent: '#B8873B',
    background: '#F2E8D8',
    foreground: '#17110A',
    muted: '#7E6B54',
  },
  fonts: { display: 'noto-kufi-arabic', body: 'ibm-plex-sans-arabic' },
  radius: '0.25rem',
  spacing: 'comfortable',
};

const GIFT_THEME: ThemeTokens = {
  colors: {
    primary: '#8A5A3B',
    secondary: '#33241A',
    accent: '#D4AF5F',
    background: '#FAF3E7',
    foreground: '#211610',
    muted: '#9A846B',
  },
  fonts: { display: 'ibm-plex-sans-arabic', body: 'source-serif-4' },
  radius: '1rem',
  spacing: 'generous',
};

const HOME_THEME: ThemeTokens = {
  colors: {
    primary: '#5C4634',
    secondary: '#2A2018',
    accent: '#BFA06A',
    background: '#F7F1E8',
    foreground: '#1D160F',
    muted: '#8B7D6B',
  },
  fonts: { display: 'ibm-plex-sans-arabic', body: 'source-serif-4' },
  radius: '0.75rem',
  spacing: 'comfortable',
};

const PERFUME_PROFILE: StoreProfile = {
  keywords: ['perfume', 'oud', 'attar', 'fragrance', 'scent', 'عطر', 'عود'],
  name: 'Dar Al Oud',
  tagline: 'Aged oud and hand-blended attar from Sharjah',
  currency: 'AED',
  theme: OUD_THEME,
  categories: [
    { name: 'Oud & Attar', slug: 'oud-and-attar' },
    { name: 'Eau de Parfum', slug: 'eau-de-parfum' },
    { name: 'Layering Oils', slug: 'layering-oils' },
  ],
  items: [
    {
      name: 'Royal Cambodi Oud',
      description:
        'Twelve-year aged Cambodian oud, distilled in small copper stills and rested a further year before bottling.',
      price: 1450,
      sku: 'OUD-CAMBODI-01',
      categorySlug: 'oud-and-attar',
    },
    {
      name: 'Hindi Oud Muattar',
      description:
        'Dense Assamese oud with a leather-and-honey opening that settles into dry cedar over several hours.',
      price: 980,
      sku: 'OUD-HINDI-02',
      categorySlug: 'oud-and-attar',
    },
    {
      name: 'Taif Rose Attar',
      description:
        'Steam-distilled from Taif roses picked before sunrise, cut with a whisper of sandalwood.',
      price: 640,
      sku: 'ATR-TAIF-03',
      categorySlug: 'oud-and-attar',
    },
    {
      name: 'Mukhallat Al Sheikh',
      description:
        'Our house blend: oud, saffron, rose and a resinous amber base. Twenty-eight ingredients, macerated six months.',
      price: 720,
      sku: 'ATR-MUKHALLAT-04',
      categorySlug: 'oud-and-attar',
    },
    {
      name: 'Amber Noir Eau de Parfum',
      description:
        'Labdanum and vanilla over a smoked oud heart. Built for cool evenings and long dinners.',
      price: 395,
      sku: 'EDP-AMBER-05',
      categorySlug: 'eau-de-parfum',
    },
    {
      name: 'Desert Fig Eau de Parfum',
      description:
        'Green fig leaf, dry cedar and warm sand. The lightest thing we make, and the one people come back for.',
      price: 340,
      sku: 'EDP-FIG-06',
      categorySlug: 'eau-de-parfum',
    },
    {
      name: 'Sandalwood Layering Oil',
      description:
        'Mysore-profile sandalwood in a light jojoba base, made to sit under an attar rather than compete with it.',
      price: 210,
      sku: 'OIL-SANDAL-07',
      categorySlug: 'layering-oils',
    },
    {
      name: 'Saffron Layering Oil',
      description:
        'A single drop lifts a heavy oud. Persian saffron, steeped for three weeks, nothing else added.',
      price: 265,
      sku: 'OIL-SAFFRON-08',
      categorySlug: 'layering-oils',
    },
  ],
  hero: {
    headline: 'Oud, aged the long way',
    subheadline:
      'Distilled in Sharjah since 1998. Every bottle rests a year before it reaches you.',
    ctaLabel: 'Shop the collection',
  },
  categoryHeading: 'Where to begin',
  productHeading: 'The collection',
  about: {
    heading: 'Our story',
    paragraphs: [
      'Dar Al Oud began in 1998 with two copper stills behind a shop in Sharjah and a single supplier in Assam. We still use the stills.',
      'We buy raw agarwood directly, distil it ourselves, and rest every batch for at least a year. It is a slow way to make perfume and the only way we know to keep it honest.',
      'Nothing leaves the workshop until the family has worn it for a week.',
    ],
  },
  contact: {
    heading: 'Visit the workshop',
    email: 'salam@daraloud.ae',
    phone: '+971 6 502 8814',
    addressLines: [
      'Al Majaz 3, Sharjah',
      'Open Saturday to Thursday, 10:00–22:00',
    ],
  },
};

const BUKHOOR_PROFILE: StoreProfile = {
  keywords: ['bukhoor', 'bakhoor', 'incense', 'burner', 'mabkhara', 'بخور'],
  name: 'Bayt Al Bukhoor',
  tagline: 'Hand-pressed bukhoor and the burners to carry it',
  currency: 'AED',
  theme: SMOKE_THEME,
  categories: [
    { name: 'Bukhoor Blends', slug: 'bukhoor-blends' },
    { name: 'Oud Chips', slug: 'oud-chips' },
    { name: 'Burners', slug: 'burners' },
  ],
  items: [
    {
      name: 'Bukhoor Al Maghrib',
      description:
        'Sandalwood powder pressed with rose water and a dark amber resin. Our evening blend, sweet without turning sharp.',
      price: 145,
      sku: 'BKH-MAGHRIB-01',
      categorySlug: 'bukhoor-blends',
    },
    {
      name: 'Bukhoor Al Diyafa',
      description:
        'The blend kept by the door for guests: heavier on oud, lighter on musk, and quick to fill a majlis.',
      price: 180,
      sku: 'BKH-DIYAFA-02',
      categorySlug: 'bukhoor-blends',
    },
    {
      name: 'Bukhoor Laban',
      description:
        'Frankincense and white musk over a soft milk note. The mildest thing we press, and the one for small rooms.',
      price: 120,
      sku: 'BKH-LABAN-03',
      categorySlug: 'bukhoor-blends',
    },
    {
      name: 'Cambodi Oud Chips',
      description:
        'Resin-heavy Cambodian chips, graded by hand. Sweet smoke that holds for close to an hour on low heat.',
      price: 890,
      sku: 'CHP-CAMBODI-04',
      categorySlug: 'oud-chips',
    },
    {
      name: 'Maroki Oud Chips',
      description:
        'Drier and more peppery than Cambodi, with a clean finish. What we burn in the shop most mornings.',
      price: 540,
      sku: 'CHP-MAROKI-05',
      categorySlug: 'oud-chips',
    },
    {
      name: 'Brass Mabkhara',
      description:
        'Spun brass with a pierced lid and a slate liner, so the base stays cool enough to move mid-burn.',
      price: 320,
      sku: 'BRN-BRASS-06',
      categorySlug: 'burners',
    },
    {
      name: 'Ceramic Table Burner',
      description:
        'Matte sand glaze, wide enough for chips and short enough to sit under a low ceiling without smoking it.',
      price: 240,
      sku: 'BRN-CERAMIC-07',
      categorySlug: 'burners',
    },
    {
      name: 'Electric Burner, Travel',
      description:
        'Runs off USB-C with three heat settings. No coal, no ash, and it fits in a carry-on.',
      price: 195,
      sku: 'BRN-TRAVEL-08',
      categorySlug: 'burners',
    },
  ],
  hero: {
    headline: 'The house smells like someone is home',
    subheadline:
      'Bukhoor pressed by hand in Ajman, in blends our grandmother wrote down.',
    ctaLabel: 'Browse the blends',
  },
  categoryHeading: 'Blends, chips and burners',
  productHeading: 'What we press',
  about: {
    heading: 'Pressed by hand since 1986',
    paragraphs: [
      'Bayt Al Bukhoor is a family workshop in Ajman. Every blend on this page is pressed by hand, in batches small enough that one person can smell the whole thing before it is wrapped.',
      'We buy oud chips directly and grade them ourselves. If a grade is not good enough to burn at home, it does not go on the shelf.',
    ],
  },
  contact: {
    heading: 'Come and smell before you buy',
    email: 'ahlan@baytalbukhoor.ae',
    phone: '+971 6 745 2210',
    addressLines: ['Ajman Souq, Shop 14', 'Saturday to Thursday, 09:00–21:00'],
  },
};

const GIFT_PROFILE: StoreProfile = {
  keywords: ['gift', 'hamper', 'present', 'celebration', 'wedding', 'هدايا'],
  name: 'Hadiya',
  tagline: 'Gift boxes assembled in Dubai, wrapped the same day',
  currency: 'AED',
  theme: GIFT_THEME,
  categories: [
    { name: 'Ramadan & Eid', slug: 'ramadan-and-eid' },
    { name: 'Corporate Gifting', slug: 'corporate-gifting' },
    { name: 'Weddings', slug: 'weddings' },
  ],
  items: [
    {
      name: 'Iftar Table Box',
      description:
        'Medjool dates, dried apricot, Turkish coffee and a brass dallah, packed in a reusable palm-weave case.',
      price: 420,
      sku: 'GFT-IFTAR-01',
      categorySlug: 'ramadan-and-eid',
    },
    {
      name: 'Eid Sweets Tower',
      description:
        'Three tiers of maamoul, baklava and date truffles from a bakery in Deira that has been at it for forty years.',
      price: 380,
      sku: 'GFT-SWEETS-02',
      categorySlug: 'ramadan-and-eid',
    },
    {
      name: 'Ramadan Lantern Set',
      description:
        'Two pierced-brass fanoos lanterns with warm LED candles, sized for a hallway or a long table.',
      price: 295,
      sku: 'GFT-LANTERN-03',
      categorySlug: 'ramadan-and-eid',
    },
    {
      name: 'Executive Desk Box',
      description:
        'Leather card holder, brass pen and a tin of single-origin coffee. Your logo blind-embossed on the lid.',
      price: 640,
      sku: 'GFT-DESK-04',
      categorySlug: 'corporate-gifting',
    },
    {
      name: 'Client Welcome Hamper',
      description:
        'Dates, honey from Hatta, and a hand-thrown cup. Sent flat-packed so it survives a courier without a scratch.',
      price: 510,
      sku: 'GFT-WELCOME-05',
      categorySlug: 'corporate-gifting',
    },
    {
      name: 'Team Thank-You Crate',
      description:
        'Twelve individually wrapped boxes in one crate, so one delivery covers a whole floor.',
      price: 1850,
      sku: 'GFT-TEAM-06',
      categorySlug: 'corporate-gifting',
    },
    {
      name: 'Bridal Trousseau Trunk',
      description:
        'Silk-lined trunk with attar, a rose-water carafe and folded linen, assembled to order in three days.',
      price: 2400,
      sku: 'GFT-TROUSSEAU-07',
      categorySlug: 'weddings',
    },
    {
      name: 'Guest Favour, Set of 50',
      description:
        'Small boxes of sugared almonds and a single date, tied with a card printed in the couple’s names.',
      price: 1150,
      sku: 'GFT-FAVOUR-08',
      categorySlug: 'weddings',
    },
  ],
  hero: {
    headline: 'Gifts that arrive already wrapped',
    subheadline:
      'Assembled in Al Quoz, delivered across the UAE the same day when you order before noon.',
    ctaLabel: 'Find a gift',
  },
  categoryHeading: 'What is the occasion?',
  productHeading: 'Ready to send',
  about: {
    heading: 'Why we started',
    paragraphs: [
      'Hadiya started because sending a good gift across the Emirates was somehow harder than sending one abroad. We fixed the part we could: assembly, wrapping and delivery, in one place.',
      'Everything is packed by hand in Al Quoz. Nothing is drop-shipped, which is why we can promise the box looks the way the photograph does.',
    ],
  },
  contact: {
    heading: 'Talk to us about a large order',
    email: 'orders@hadiya.ae',
    phone: '+971 4 338 9902',
    addressLines: [
      'Alserkal Avenue, Al Quoz 1, Dubai',
      'Sunday to Thursday, 09:00–18:00',
    ],
  },
};

/** Used when nothing matches: a real store rather than an apology for the keywords missing. */
const DEFAULT_PROFILE: StoreProfile = {
  keywords: [],
  name: 'Bayt Majlis',
  tagline: 'Furnishings and tableware for the Gulf home',
  currency: 'AED',
  theme: HOME_THEME,
  categories: [
    { name: 'Majlis Textiles', slug: 'majlis-textiles' },
    { name: 'Coffee & Tea', slug: 'coffee-and-tea' },
    { name: 'Table & Serving', slug: 'table-and-serving' },
  ],
  items: [
    {
      name: 'Sadu Floor Cushion',
      description:
        'Hand-woven sadu panel on undyed cotton, filled firm enough to sit on properly rather than sink into.',
      price: 340,
      sku: 'TXT-SADU-01',
      categorySlug: 'majlis-textiles',
    },
    {
      name: 'Camel Wool Throw',
      description:
        'Undyed camel wool, loom-finished in Al Ain. Heavy enough for a majlis that keeps the air conditioning low.',
      price: 620,
      sku: 'TXT-THROW-02',
      categorySlug: 'majlis-textiles',
    },
    {
      name: 'Linen Majlis Runner',
      description:
        'Washed linen with a hand-knotted fringe, cut long for a full seating arrangement.',
      price: 280,
      sku: 'TXT-RUNNER-03',
      categorySlug: 'majlis-textiles',
    },
    {
      name: 'Brass Dallah, 1.2L',
      description:
        'Spun and hammered by a workshop in Ras Al Khaimah, with a lid that seals well enough to travel.',
      price: 450,
      sku: 'CFE-DALLAH-04',
      categorySlug: 'coffee-and-tea',
    },
    {
      name: 'Finjan Set of Six',
      description:
        'Porcelain finjan with a matte sand glaze and a gold rim, sized for gahwa rather than espresso.',
      price: 260,
      sku: 'CFE-FINJAN-05',
      categorySlug: 'coffee-and-tea',
    },
    {
      name: 'Cardamom Gahwa Blend',
      description:
        'Light-roast Arabica ground with green cardamom and a little saffron. Roasted weekly, never stocked deep.',
      price: 95,
      sku: 'CFE-GAHWA-06',
      categorySlug: 'coffee-and-tea',
    },
    {
      name: 'Date Serving Platter',
      description:
        'Turned acacia with a brass inlay ring, wide and shallow so a full tray still reads as generous.',
      price: 310,
      sku: 'TBL-PLATTER-07',
      categorySlug: 'table-and-serving',
    },
    {
      name: 'Rose Water Carafe',
      description:
        'Hand-blown glass with a long neck and a fine pour, made for the sprinkle at the end of a meal.',
      price: 185,
      sku: 'TBL-CARAFE-08',
      categorySlug: 'table-and-serving',
    },
  ],
  hero: {
    headline: 'A majlis worth sitting in',
    subheadline:
      'Textiles, brass and tableware made in the Emirates, for homes that still host properly.',
    ctaLabel: 'Shop the house',
  },
  categoryHeading: 'Room by room',
  productHeading: 'New this season',
  about: {
    heading: 'Made close to home',
    paragraphs: [
      'Bayt Majlis works with weavers in Al Ain, a brass workshop in Ras Al Khaimah and a small pottery in Fujairah. We visit all three; none of them are a marketing story.',
      'We stock shallow on purpose. When something sells out it usually means the next batch is on a loom rather than in a container.',
    ],
  },
  contact: {
    heading: 'Find us',
    email: 'hello@baytmajlis.ae',
    phone: '+971 4 221 7788',
    addressLines: ['Warehouse 12, Al Quoz 3, Dubai', 'Daily, 10:00–20:00'],
  },
};

const PROFILES: readonly StoreProfile[] = [
  PERFUME_PROFILE,
  BUKHOOR_PROFILE,
  GIFT_PROFILE,
];

@Injectable()
export class MockGenerator implements AiGeneratorPort {
  private readonly logger = new Logger(MockGenerator.name);

  generate(request: BlueprintGenerationRequest): Promise<GeneratedBlueprint> {
    const profile = selectProfile(request.prompt);
    this.logger.log(
      `Generated the "${profile.name}" fixture (locale ${request.locale})`,
    );

    return Promise.resolve({
      raw: toBlueprint(profile, request),
      promptVersion: MOCK_PROMPT_VERSION,
    });
  }
}

/** First keyword match wins, so a prompt naming two domains resolves the same way every time. */
function selectProfile(prompt: string): StoreProfile {
  const haystack = prompt.toLowerCase();
  return (
    PROFILES.find((profile) =>
      profile.keywords.some((keyword) => haystack.includes(keyword)),
    ) ?? DEFAULT_PROFILE
  );
}

function toBlueprint(
  profile: StoreProfile,
  request: BlueprintGenerationRequest,
): StoreBlueprint {
  const categorySlugs = profile.categories.map((category) => category.slug);

  return {
    store: {
      name: profile.name,
      tagline: profile.tagline,
      // The requested locale is honoured so the storefront renders right-to-left for an
      // Arabic store. The copy stays English: a fixture that pretended to translate would
      // be a worse lie than one that is plainly a fixture.
      locale: request.locale,
      currency: profile.currency,
    },
    theme: profile.theme,
    categories: profile.categories.map((category) => ({ ...category })),
    products: profile.items.map((item) => ({
      name: item.name,
      description: item.description,
      price: item.price,
      sku: item.sku,
      categorySlug: item.categorySlug,
    })),
    pages: [
      {
        type: 'HOME',
        title: 'Home',
        slug: 'home',
        sections: [
          {
            type: 'HERO',
            headline: profile.hero.headline,
            subheadline: profile.hero.subheadline,
            ctaLabel: profile.hero.ctaLabel,
            ctaHref: '#products',
          },
          {
            type: 'CATEGORY_GRID',
            heading: profile.categoryHeading,
            categorySlugs,
          },
          {
            type: 'PRODUCT_GRID',
            heading: profile.productHeading,
            limit: profile.items.length,
          },
        ],
      },
      {
        type: 'ABOUT',
        title: profile.about.heading,
        slug: 'about',
        sections: [
          {
            type: 'RICH_TEXT',
            heading: profile.about.heading,
            paragraphs: [...profile.about.paragraphs],
          },
        ],
      },
      {
        type: 'CONTACT',
        title: profile.contact.heading,
        slug: 'contact',
        sections: [
          {
            type: 'CONTACT',
            heading: profile.contact.heading,
            email: profile.contact.email,
            phone: profile.contact.phone,
            addressLines: [...profile.contact.addressLines],
          },
        ],
      },
    ],
  };
}
