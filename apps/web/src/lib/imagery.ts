/**
 * Every photograph this product ships, in one place.
 *
 * The rule that made this a file rather than a habit: a URL written inline is a URL nobody
 * can audit. Here, each entry carries the subject it depicts and the alt text that goes
 * with it, so "does the perfume section show perfume" is a question this file answers
 * rather than one that needs a browser.
 *
 * They are Unsplash's, requested through its CDN with explicit crop parameters — the source
 * images are 4000px wide and a marketing page has no business shipping that. `next/image`
 * still handles sizing and format; `w=` here caps what it has to fetch upstream.
 *
 * None of this touches a *generated* store's own `product.imageUrl`. That is the model's
 * data and is rendered as-is (`product-grid.section.tsx`).
 */

export interface DemoImage {
  /** Requested at a sensible ceiling; `next/image` narrows it per breakpoint. */
  readonly src: string;
  /** Never decorative — every one of these is content, so every one is described. */
  readonly alt: string;
  /** Intrinsic ratio of the crop below, so layouts can reserve space without guessing. */
  readonly width: number;
  readonly height: number;
}

const UNSPLASH = "https://images.unsplash.com";

function unsplash(
  id: string,
  alt: string,
  width: number,
  height: number,
): DemoImage {
  return {
    src: `${UNSPLASH}/${id}?auto=format&fit=crop&q=80&w=${String(width)}&h=${String(height)}`,
    alt,
    width,
    height,
  };
}

/**
 * The library, keyed by what is in the picture.
 *
 * Verified by eye, one by one, before being written down — the failure this prevents is a
 * "luxury oud" card illustrated with a stock photo of an open-plan office.
 */
export const IMAGERY = {
  perfumeBottles: unsplash(
    "photo-1615634260167-c8cdede054de",
    "Cut-glass perfume bottles lit from behind on a dark counter",
    1200,
    900,
  ),
  attarVials: unsplash(
    "photo-1602928321679-560bb453f190",
    "Row of glass vials holding amber attar oil",
    1200,
    900,
  ),
  incenseVessels: unsplash(
    "photo-1610701596007-11502861dcfa",
    "Hand-thrown ceramic vessels in sand and cream glazes",
    1200,
    900,
  ),
  goldNecklace: unsplash(
    "photo-1599643478518-a784e5dc4c8f",
    "Fine gold necklace with a crescent pendant, warm bokeh behind it",
    1200,
    900,
  ),
  diamondBracelets: unsplash(
    "photo-1573408301185-9146fe634ad0",
    "Two diamond bracelets photographed against black",
    1200,
    900,
  ),
  pearlNecklace: unsplash(
    "photo-1515562141207-7a88fb7ce338",
    "Pearl necklace resting in an open presentation box",
    1200,
    900,
  ),
  roseGoldBracelet: unsplash(
    "photo-1611591437281-460bfbe1220a",
    "Rose gold bracelet set with pale stones on a blush background",
    1200,
    900,
  ),
  solitaireRing: unsplash(
    "photo-1605100804763-247f67b3557e",
    "Solitaire diamond ring on a dark faceted stand",
    1200,
    900,
  ),
  clothingRail: unsplash(
    "photo-1490481651871-ab68de25d43d",
    "Neutral-toned garments hanging on a single rail",
    1200,
    900,
  ),
  boutiqueInterior: unsplash(
    "photo-1441984904996-e0b6ba687e04",
    "Interior of a small clothing boutique with brass fittings",
    1200,
    900,
  ),
  artisanSoaps: unsplash(
    "photo-1600857544200-b2f666a9a2ec",
    "Hand-cut soap bars wrapped in cloth beside dried lavender",
    1200,
    900,
  ),
  botanicalFlatlay: unsplash(
    "photo-1512389142860-9c449e58a543",
    "Dried branches and seed pods arranged on a pale stone surface",
    1200,
    900,
  ),
  dubaiSkylineDusk: unsplash(
    "photo-1512453979798-5ea266f8880c",
    "Dubai's towers and interchange photographed at dusk",
    1600,
    1000,
  ),
  dubaiSkylineNight: unsplash(
    "photo-1526495124232-a04e1849168c",
    "Sheikh Zayed Road lit at night, seen from above",
    1600,
    1000,
  ),
  burjAlArab: unsplash(
    "photo-1546412414-e1885259563a",
    "The Burj Al Arab seen across the water in the late afternoon",
    1600,
    1000,
  ),
} as const satisfies Record<string, DemoImage>;

export type ImageryKey = keyof typeof IMAGERY;

/**
 * Which photograph illustrates a piece of a *generated* store.
 *
 * A generated catalogue has no photography — `imageUrl` is null on every product this app
 * has ever saved (architecture.md §14). The old fallback was a gradient tile, which is
 * honest but makes every demo look unfinished. This is the middle position: match the
 * product's own words against a subject we actually hold a picture of, and fall back to the
 * gradient when nothing matches, rather than illustrating a coffee shop with a diamond ring.
 *
 * Matching is on the *whole* phrase — product name plus its category — because "gold" alone
 * is as likely to be a perfume note as a bracelet.
 */
const SUBJECT_KEYWORDS: readonly {
  readonly keys: readonly ImageryKey[];
  readonly words: readonly string[];
}[] = [
  /*
    Four photographs per fragrance subject rather than two, which is a distribution decision
    rather than a taste one: a generated catalogue is eight products, and a subject holding
    two pictures puts the same bottle in four tiles of the same grid. Every key listed under
    a subject has to be plausible for *any* product in it — which is why the ceramics and the
    dried botanicals appear here and the culinary spice shot that used to does not.
  */
  {
    keys: [
      "attarVials",
      "perfumeBottles",
      "incenseVessels",
      "botanicalFlatlay",
    ],
    words: [
      "oud",
      "attar",
      "عود",
      "dehn",
      "agarwood",
      "mukhallat",
      "oil",
      "زيت",
    ],
  },
  {
    keys: ["incenseVessels", "botanicalFlatlay", "attarVials", "artisanSoaps"],
    words: [
      "bukhoor",
      "بخور",
      "incense",
      "burner",
      "resin",
      "chips",
      "musk",
      "amber",
      "عنبر",
    ],
  },
  {
    keys: [
      "perfumeBottles",
      "attarVials",
      "botanicalFlatlay",
      "incenseVessels",
    ],
    words: [
      "perfume",
      "parfum",
      "fragrance",
      "scent",
      "eau",
      "cologne",
      "spray",
      "عطر",
    ],
  },
  {
    keys: [
      "goldNecklace",
      "diamondBracelets",
      "pearlNecklace",
      "roseGoldBracelet",
      "solitaireRing",
    ],
    words: [
      "jewel",
      "jewellery",
      "jewelry",
      "necklace",
      "bracelet",
      "ring",
      "earring",
      "pendant",
      "pearl",
      "diamond",
      "مجوهرات",
      "ذهب",
    ],
  },
  {
    keys: ["clothingRail", "boutiqueInterior"],
    words: [
      "abaya",
      "kaftan",
      "kandura",
      "dress",
      "shawl",
      "scarf",
      "thobe",
      "fashion",
      "coat",
      "linen",
      "عباية",
      "أزياء",
    ],
  },
  {
    keys: ["artisanSoaps", "botanicalFlatlay", "incenseVessels"],
    words: [
      "gift",
      "hamper",
      "box",
      "soap",
      "candle",
      "balm",
      "cream",
      "bath",
      "هدايا",
    ],
  },
];

/**
 * `seed` decides *which* of a subject's photographs is used, so a grid of eight perfumes is
 * not eight copies of one bottle — and so the same product is the same photograph on every
 * render and every machine, which a random pick would not be.
 */
export function imageryFor(phrase: string, seed: string): DemoImage | null {
  const match = subjectFor(phrase);
  if (match === undefined) {
    return null;
  }

  const key = match.keys[hash(seed) % match.keys.length];
  return key === undefined ? null : IMAGERY[key];
}

/**
 * The *best* photograph for a subject rather than a spread of them.
 *
 * A grid wants variety; a hero wants the strongest single image, and the first key of each
 * subject is ordered to be exactly that. Spreading a hero across the same set as the product
 * tiles is how an oud shop ended up leading with a photograph of dried branches while the
 * bottle of attar sat in a thumbnail three sections down.
 */
export function primaryImageryFor(phrase: string): DemoImage | null {
  const key = subjectFor(phrase)?.keys[0];
  return key === undefined ? null : IMAGERY[key];
}

function subjectFor(
  phrase: string,
): (typeof SUBJECT_KEYWORDS)[number] | undefined {
  const haystack = phrase.toLowerCase();
  return SUBJECT_KEYWORDS.find((subject) =>
    subject.words.some((word) => haystack.includes(word)),
  );
}

/**
 * A positional hash, not a sum of character codes.
 *
 * The sum was the first version and it clustered badly: SKUs from one generation differ by
 * a digit or two, so `sum % 4` landed most of a catalogue on the same picture. Multiplying
 * by 31 at each step makes the position of a character matter, which is enough to spread
 * eight near-identical SKUs across four images. Still fully deterministic — the same product
 * is the same photograph on every render and every machine.
 */
function hash(seed: string): number {
  let value = 7;
  for (const char of seed) {
    value = (value * 31 + char.charCodeAt(0)) >>> 0;
  }
  return value;
}
