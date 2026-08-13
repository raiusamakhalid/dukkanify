import type { BodyFont, DisplayFont } from "@dukkanify/contracts";
import {
  IBM_Plex_Sans_Arabic,
  Noto_Kufi_Arabic,
  Source_Serif_4,
} from "next/font/google";

/**
 * Every font the contract can name, loaded once at build time.
 *
 * `DISPLAY_FONTS` and `BODY_FONTS` are an enum in `@dukkanify/contracts` precisely because
 * of this file: `next/font` self-hosts and subsets a family during the build, so a family
 * the model invented at request time could never load. Three names, three loaders, and
 * `CSS_VARIABLE` below is the only place the two vocabularies meet.
 *
 * Both Arabic faces are here for a reason beyond the enum — an Arabic storefront set in a
 * Latin-only face is not right-to-left support, it is a fallback nobody chose.
 */

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic", "latin"],
  // Not a variable font, so the weights have to be named. These four are what the product
  // uses: body, emphasis, headings, and the display line on the landing hero.
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoKufiArabic = Noto_Kufi_Arabic({
  variable: "--font-noto-kufi-arabic",
  subsets: ["arabic"],
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  display: "swap",
});

/**
 * The custom property each family publishes itself under.
 *
 * These names are written twice — here and in the loader calls above — because `next/font`
 * extracts its arguments at compile time and rejects anything that is not a literal. The
 * record is what makes the repetition safe: it is keyed by the contract's own font enum, so
 * a family added to the contract without a loader is a type error rather than a blank page.
 * `globals.css` reads the same two names for the product's own typography.
 */
const CSS_VARIABLE: Record<DisplayFont | BodyFont, `--${string}`> = {
  "ibm-plex-sans-arabic": "--font-ibm-plex-sans-arabic",
  "noto-kufi-arabic": "--font-noto-kufi-arabic",
  "source-serif-4": "--font-source-serif-4",
};

const SANS_FALLBACK = "ui-sans-serif, system-ui, sans-serif";
const SERIF_FALLBACK = "ui-serif, Georgia, serif";

/**
 * Applied once, on `<html>`, so every family is addressable from CSS anywhere below it.
 * These are class names, not variable names — `next/font` publishes the custom property
 * from a generated class.
 */
export const fontVariables = [
  ibmPlexSansArabic.variable,
  notoKufiArabic.variable,
  sourceSerif4.variable,
].join(" ");

/**
 * A generated theme's font token as a CSS `font-family` value.
 *
 * Returns a stack rather than a bare variable: the family is fetched over the network, and
 * a storefront rendering in an unstyled fallback for the first paint is a worse first
 * impression than one rendering in the system sans.
 */
export function fontStackFor(font: DisplayFont | BodyFont): string {
  const fallback = font === "source-serif-4" ? SERIF_FALLBACK : SANS_FALLBACK;
  return `var(${CSS_VARIABLE[font]}), ${fallback}`;
}
