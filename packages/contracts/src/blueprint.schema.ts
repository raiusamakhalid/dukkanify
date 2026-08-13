import { z } from "zod";
import { PAGE_TYPES, PageTypeSchema } from "./enums";
import {
  CurrencySchema,
  LocaleSchema,
  SkuSchema,
  SlugSchema,
  text,
} from "./primitives";
import { SectionContentSchema } from "./section.schema";
import { ThemeTokensSchema } from "./theme.schema";

/**
 * What the model is asked to produce, and nothing more.
 *
 * Anything code can derive is deliberately absent, because asking a language model to
 * guarantee what a function can guarantee is how generation fails (architecture.md §7):
 *
 * - the store slug     — must be globally unique, which only the database can decide
 * - reading direction  — follows the locale, via `directionForLocale`
 * - `position` fields  — arrays are already ordered; index is the position
 * - product currency   — one store, one currency, taken from `store.currency`
 * - image URLs         — deterministic placeholders, never a hallucinated link
 *
 * These constants are exported so the system prompt states the same numbers this schema
 * enforces. One definition, so prompt and validator cannot drift.
 */
export const PRODUCTS_PER_STORE = 8;
export const MIN_CATEGORIES = 2;
export const MAX_CATEGORIES = 6;
export const MIN_SECTIONS_PER_PAGE = 1;
export const MAX_SECTIONS_PER_PAGE = 6;

export const StoreMetaBlueprintSchema = z.object({
  name: text(60),
  tagline: text(140),
  locale: LocaleSchema,
  currency: CurrencySchema,
});
export type StoreMetaBlueprint = z.infer<typeof StoreMetaBlueprintSchema>;

export const CategoryBlueprintSchema = z.object({
  name: text(60),
  slug: SlugSchema,
});
export type CategoryBlueprint = z.infer<typeof CategoryBlueprintSchema>;

export const ProductBlueprintSchema = z.object({
  name: text(80),
  description: text(400),
  /**
   * A JSON number on the way in, a `Decimal(10,2)` once stored. The use case clamps to two
   * places; the contract only refuses values a currency cannot hold at all.
   */
  price: z.number().positive().max(99_999_999.99),
  sku: SkuSchema,
  categorySlug: SlugSchema,
});
export type ProductBlueprint = z.infer<typeof ProductBlueprintSchema>;

export const PageBlueprintSchema = z.object({
  type: PageTypeSchema,
  title: text(80),
  slug: SlugSchema,
  sections: z
    .array(SectionContentSchema)
    .min(MIN_SECTIONS_PER_PAGE)
    .max(MAX_SECTIONS_PER_PAGE),
});
export type PageBlueprint = z.infer<typeof PageBlueprintSchema>;

/**
 * The structural half of the contract: shapes, types, lengths and formats, with no
 * cross-field rules. Exported because it is what becomes the model's tool schema — JSON
 * Schema cannot express "this slug must appear in that array", so the refinements below
 * are deliberately not part of it.
 */
export const StoreBlueprintStructureSchema = z.object({
  store: StoreMetaBlueprintSchema,
  theme: ThemeTokensSchema,
  categories: z
    .array(CategoryBlueprintSchema)
    .min(MIN_CATEGORIES)
    .max(MAX_CATEGORIES),
  products: z.array(ProductBlueprintSchema).length(PRODUCTS_PER_STORE),
  pages: z.array(PageBlueprintSchema).length(PAGE_TYPES.length),
});

/**
 * Cross-field rules live here rather than in the use case because these are the failures
 * a model actually makes, and the repair turn needs the exact issue to correct itself.
 *
 * Every message names the offending value: "repair this" only works if the model is told
 * what was wrong, which is the whole difference between a repair turn and a blind retry.
 */
export const StoreBlueprintSchema = StoreBlueprintStructureSchema.superRefine(
  (blueprint, ctx) => {
    const known = new Set<string>();

    blueprint.categories.forEach((category, index) => {
      if (known.has(category.slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["categories", index, "slug"],
          message: `duplicate category slug "${category.slug}" — each category needs a distinct slug`,
        });
        return;
      }
      known.add(category.slug);
    });

    /** Every dangling reference gets the same message, listing what it could have said instead. */
    const requireKnownCategory = (
      slug: string,
      path: (string | number)[],
    ): void => {
      if (!known.has(slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `"${slug}" is not one of the generated categories (${[...known].join(", ")})`,
        });
      }
    };

    blueprint.products.forEach((product, index) => {
      requireKnownCategory(product.categorySlug, [
        "products",
        index,
        "categorySlug",
      ]);
    });

    PAGE_TYPES.forEach((pageType) => {
      const count = blueprint.pages.filter(
        (page) => page.type === pageType,
      ).length;
      if (count !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pages"],
          message: `expected exactly one ${pageType} page, received ${count}`,
        });
      }
    });

    const homePage = blueprint.pages.find((page) => page.type === "HOME");
    if (
      homePage !== undefined &&
      !homePage.sections.some((section) => section.type === "HERO")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pages"],
        message: "the HOME page must contain a HERO section",
      });
    }

    blueprint.pages.forEach((page, pageIndex) => {
      page.sections.forEach((section, sectionIndex) => {
        const sectionPath = ["pages", pageIndex, "sections", sectionIndex];
        switch (section.type) {
          case "CATEGORY_GRID":
            section.categorySlugs.forEach((slug, slugIndex) => {
              requireKnownCategory(slug, [
                ...sectionPath,
                "categorySlugs",
                slugIndex,
              ]);
            });
            break;
          case "PRODUCT_GRID":
            if (section.categorySlug !== undefined) {
              requireKnownCategory(section.categorySlug, [
                ...sectionPath,
                "categorySlug",
              ]);
            }
            break;
          default:
            break;
        }
      });
    });
  },
);

export type StoreBlueprint = z.infer<typeof StoreBlueprintSchema>;
