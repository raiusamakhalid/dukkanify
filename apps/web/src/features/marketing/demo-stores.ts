import type { Locale, ThemeTokens } from "@dukkanify/contracts";
import { IMAGERY, type DemoImage } from "@/lib/imagery";

/**
 * The storefronts the landing page shows, and the prompts they came from.
 *
 * Two constraints kept these honest. The palettes are real `ThemeTokens` — the same type
 * the model must produce and the contract validates — so a swatch on this page is a swatch
 * the generator could actually pick, and `themeToCssVariables` paints these previews exactly
 * as it paints a live shop. And every photograph is pulled from `lib/imagery.ts` by name, so
 * the perfume house is illustrated with perfume.
 *
 * They are marketing, not data: nothing here is fetched, nothing here is saved, and no route
 * resolves them. The prompt on each one is the sentence a person would type to get it.
 */

export interface DemoProduct {
  readonly name: string;
  readonly price: string;
  readonly image: DemoImage;
}

export interface DemoStore {
  readonly id: string;
  readonly name: string;
  /** The shop's line of business, for the template card's eyebrow. */
  readonly category: string;
  readonly prompt: string;
  readonly locale: Locale;
  readonly nav: readonly string[];
  readonly hero: {
    readonly eyebrow: string;
    readonly headline: string;
    readonly subheadline: string;
    readonly cta: string;
  };
  readonly heroImage: DemoImage;
  readonly products: readonly DemoProduct[];
  readonly theme: ThemeTokens;
}

export const AL_NOOR: DemoStore = {
  id: "al-noor",
  name: "Al Noor Fragrances",
  category: "Luxury Perfume",
  prompt: "Create a luxury perfume store for UAE customers",
  locale: "en",
  nav: ["Collection", "Oud", "About", "Contact"],
  hero: {
    eyebrow: "Sharjah, since 1994",
    headline: "Discover Your Signature Scent",
    subheadline:
      "Aged oud, hand-blended attar and eau de parfum, decanted to order in our Sharjah atelier.",
    cta: "Shop the Collection",
  },
  heroImage: IMAGERY.perfumeBottles,
  products: [
    { name: "Layali Oud", price: "AED 480", image: IMAGERY.perfumeBottles },
    { name: "Attar Al Rimal", price: "AED 320", image: IMAGERY.attarVials },
    { name: "Musk Abiyad", price: "AED 265", image: IMAGERY.botanicalFlatlay },
    { name: "Nuit de Dubai", price: "AED 610", image: IMAGERY.incenseVessels },
  ],
  theme: {
    colors: {
      primary: "#0B5D4B",
      secondary: "#1D2A26",
      accent: "#C8A45D",
      background: "#FAF6EE",
      foreground: "#17211F",
      muted: "#6E7B76",
    },
    fonts: { display: "ibm-plex-sans-arabic", body: "source-serif-4" },
    radius: "0.5rem",
    spacing: "generous",
  },
};

/**
 * The same shop, generated from an Arabic sentence.
 *
 * Not a translation of the one above — a *second* generation. It is here to make one claim
 * checkable on the page rather than asserted in a bullet: an Arabic prompt produces an
 * Arabic shop, typeset in an Arabic face and laid out right to left, with no switch to flip.
 */
export const AL_NOOR_AR: DemoStore = {
  id: "al-noor-ar",
  name: "دار النور للعطور",
  category: "عطور فاخرة",
  prompt: "متجر عطور فاخرة لعملاء الإمارات",
  locale: "ar",
  nav: ["المجموعة", "العود", "من نحن", "تواصل معنا"],
  hero: {
    eyebrow: "الشارقة، منذ ١٩٩٤",
    headline: "اكتشف عطرك المميز",
    subheadline:
      "عود معتّق وعطور مركّبة يدويًا، تُعبّأ حسب الطلب في مشغلنا بالشارقة.",
    cta: "تسوّق المجموعة",
  },
  heroImage: IMAGERY.perfumeBottles,
  products: [
    { name: "ليالي العود", price: "٤٨٠ د.إ", image: IMAGERY.perfumeBottles },
    { name: "عطر الرمال", price: "٣٢٠ د.إ", image: IMAGERY.attarVials },
    { name: "مسك أبيض", price: "٢٦٥ د.إ", image: IMAGERY.botanicalFlatlay },
    { name: "ليل دبي", price: "٦١٠ د.إ", image: IMAGERY.incenseVessels },
  ],
  theme: {
    colors: {
      primary: "#0B5D4B",
      secondary: "#1D2A26",
      accent: "#C8A45D",
      background: "#FAF6EE",
      foreground: "#17211F",
      muted: "#6E7B76",
    },
    fonts: { display: "noto-kufi-arabic", body: "ibm-plex-sans-arabic" },
    radius: "0.5rem",
    spacing: "generous",
  },
};

const EMIRATI_OUD: DemoStore = {
  id: "emirati-oud",
  name: "Emirati Oud",
  category: "Oud & Bukhoor",
  prompt: "Build an Arabic oud and bukhoor store with brass burners",
  locale: "en",
  nav: ["Bukhoor", "Oud Chips", "Burners", "Contact"],
  hero: {
    eyebrow: "Hand-pressed in Al Ain",
    headline: "The House Smells Like Home",
    subheadline:
      "Bukhoor pressed by hand in small batches, and the brass to burn it on.",
    cta: "Browse Bukhoor",
  },
  heroImage: IMAGERY.incenseVessels,
  products: [
    {
      name: "Bukhoor Al Layl",
      price: "AED 145",
      image: IMAGERY.incenseVessels,
    },
    {
      name: "Cambodi Chips",
      price: "AED 890",
      image: IMAGERY.botanicalFlatlay,
    },
    { name: "Brass Mabkhara", price: "AED 240", image: IMAGERY.artisanSoaps },
    { name: "Amber Resin", price: "AED 190", image: IMAGERY.attarVials },
  ],
  theme: {
    colors: {
      primary: "#C8A45D",
      secondary: "#0E1A16",
      accent: "#E8D5B5",
      background: "#141A18",
      foreground: "#F3EFE6",
      muted: "#9AA5A0",
    },
    fonts: { display: "noto-kufi-arabic", body: "ibm-plex-sans-arabic" },
    radius: "0.25rem",
    spacing: "comfortable",
  },
};

const NOOR_JEWELRY: DemoStore = {
  id: "noor-jewelry",
  name: "Noor Jewellery",
  category: "Luxury Jewellery",
  prompt: "Build a premium jewellery store for Dubai Gold Souk shoppers",
  locale: "en",
  nav: ["High Jewellery", "Bridal", "Gifts", "Visit"],
  hero: {
    eyebrow: "Gold Souk, Deira",
    headline: "Worn Every Day, Kept for Generations",
    subheadline:
      "21-karat gold and certified stones, set by hand in Deira since 1978.",
    cta: "View High Jewellery",
  },
  heroImage: IMAGERY.goldNecklace,
  products: [
    { name: "Hilal Pendant", price: "AED 2,450", image: IMAGERY.goldNecklace },
    {
      name: "Sabaa Bangles",
      price: "AED 5,900",
      image: IMAGERY.diamondBracelets,
    },
    { name: "Lulu Strand", price: "AED 3,200", image: IMAGERY.pearlNecklace },
    {
      name: "Warda Solitaire",
      price: "AED 8,750",
      image: IMAGERY.solitaireRing,
    },
  ],
  theme: {
    colors: {
      primary: "#073F35",
      secondary: "#2B2419",
      accent: "#C8A45D",
      background: "#FFFDF8",
      foreground: "#191512",
      muted: "#7C7568",
    },
    fonts: { display: "ibm-plex-sans-arabic", body: "source-serif-4" },
    radius: "1rem",
    spacing: "generous",
  },
};

const DESERT_THREADS: DemoStore = {
  id: "desert-threads",
  name: "Desert Threads",
  category: "Arabic Fashion",
  prompt: "Create a modern abaya and kaftan label for Dubai",
  locale: "en",
  nav: ["Abayas", "Kaftans", "Shawls", "Atelier"],
  hero: {
    eyebrow: "Made in Dubai",
    headline: "Quiet Luxury, Cut for the Gulf",
    subheadline:
      "Abayas and kaftans in washed linen and silk crepe, made to order in six days.",
    cta: "Shop New Season",
  },
  heroImage: IMAGERY.clothingRail,
  products: [
    { name: "Sabkha Abaya", price: "AED 1,180", image: IMAGERY.clothingRail },
    { name: "Falaj Kaftan", price: "AED 940", image: IMAGERY.boutiqueInterior },
    { name: "Ghaf Shawl", price: "AED 420", image: IMAGERY.botanicalFlatlay },
    {
      name: "Rimal Overlayer",
      price: "AED 1,360",
      image: IMAGERY.artisanSoaps,
    },
  ],
  theme: {
    colors: {
      primary: "#2E3A34",
      secondary: "#E8D5B5",
      accent: "#A98B4F",
      background: "#F6F2EA",
      foreground: "#20261F",
      muted: "#77807A",
    },
    fonts: { display: "ibm-plex-sans-arabic", body: "source-serif-4" },
    radius: "0rem",
    spacing: "comfortable",
  },
};

/** The showcase row, in the order it reads best: warm, dark, bright, muted. */
export const DEMO_STORES: readonly DemoStore[] = [
  AL_NOOR,
  EMIRATI_OUD,
  NOOR_JEWELRY,
  DESERT_THREADS,
];

/**
 * The four palettes the theme showcase cycles through, over one unchanged storefront.
 *
 * Each is a complete `ThemeTokens`, because that is the unit the generator emits and the
 * unit the preview applies — cycling half a theme would demonstrate something the product
 * cannot do.
 */
export const THEME_PRESETS: readonly {
  readonly name: string;
  readonly theme: ThemeTokens;
}[] = [
  { name: "Emirati", theme: AL_NOOR.theme },
  { name: "Midnight Oud", theme: EMIRATI_OUD.theme },
  { name: "Gold Souk", theme: NOOR_JEWELRY.theme },
  { name: "Desert Linen", theme: DESERT_THREADS.theme },
];
