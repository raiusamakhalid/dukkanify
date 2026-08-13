import { z } from "zod";

/**
 * Mirrors of the enums in apps/api/prisma/schema.prisma.
 *
 * The duplication is structural: Prisma owns the database enum, this package owns the
 * wire and UI enum, and neither can import the other without breaking the dependency
 * rule. CLAUDE.md therefore requires both to change in the same commit.
 */

export const STORE_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export const StoreStatusSchema = z.enum(STORE_STATUSES);
export type StoreStatus = z.infer<typeof StoreStatusSchema>;

export const DIRECTIONS = ["LTR", "RTL"] as const;
export const DirectionSchema = z.enum(DIRECTIONS);
export type Direction = z.infer<typeof DirectionSchema>;

export const PAGE_TYPES = ["HOME", "ABOUT", "CONTACT"] as const;
export const PageTypeSchema = z.enum(PAGE_TYPES);
export type PageType = z.infer<typeof PageTypeSchema>;

export const SECTION_TYPES = [
  "HERO",
  "CATEGORY_GRID",
  "PRODUCT_GRID",
  "RICH_TEXT",
  "CONTACT",
] as const;
export const SectionTypeSchema = z.enum(SECTION_TYPES);
export type SectionType = z.infer<typeof SectionTypeSchema>;

/** Reading direction follows the locale, so nothing has to keep the two in agreement. */
export function directionForLocale(locale: "en" | "ar"): Direction {
  return locale === "ar" ? "RTL" : "LTR";
}
