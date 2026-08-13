import { z } from "zod";
import type { SectionType } from "./enums";
import {
  EmailSchema,
  InternalHrefSchema,
  PhoneSchema,
  SlugSchema,
  text,
} from "./primitives";

/**
 * Section content, discriminated on `type`.
 *
 * The discriminator lives inside the content rather than beside it so that one narrowing
 * gives a renderer its exact props: `content.type === 'HERO'` proves `content.headline`
 * exists. The `Section.type` column in Prisma is written from this field, never
 * independently, so the two cannot disagree.
 */

export const HeroContentSchema = z.object({
  type: z.literal("HERO"),
  headline: text(120),
  subheadline: text(280),
  ctaLabel: text(40),
  ctaHref: InternalHrefSchema.default("#products"),
});
export type HeroContent = z.infer<typeof HeroContentSchema>;

export const CategoryGridContentSchema = z.object({
  type: z.literal("CATEGORY_GRID"),
  heading: text(80),
  subheading: text(200).optional(),
  /** Slugs of categories to feature, in display order. Resolved against the store's own categories. */
  categorySlugs: z.array(SlugSchema).min(2).max(6),
});
export type CategoryGridContent = z.infer<typeof CategoryGridContentSchema>;

export const ProductGridContentSchema = z.object({
  type: z.literal("PRODUCT_GRID"),
  heading: text(80),
  subheading: text(200).optional(),
  /** Omitted means every product in the store; a slug narrows the grid to one category. */
  categorySlug: SlugSchema.optional(),
  limit: z.number().int().min(1).max(24).default(8),
});
export type ProductGridContent = z.infer<typeof ProductGridContentSchema>;

export const RichTextContentSchema = z.object({
  type: z.literal("RICH_TEXT"),
  heading: text(80),
  /** Paragraphs, not one blob: the renderer controls spacing, and no markdown parser is needed. */
  paragraphs: z.array(text(600)).min(1).max(6),
});
export type RichTextContent = z.infer<typeof RichTextContentSchema>;

export const ContactContentSchema = z.object({
  type: z.literal("CONTACT"),
  heading: text(80),
  email: EmailSchema,
  phone: PhoneSchema,
  whatsapp: PhoneSchema.optional(),
  addressLines: z.array(text(120)).min(1).max(4),
});
export type ContactContent = z.infer<typeof ContactContentSchema>;

export const SectionContentSchema = z.discriminatedUnion("type", [
  HeroContentSchema,
  CategoryGridContentSchema,
  ProductGridContentSchema,
  RichTextContentSchema,
  ContactContentSchema,
]);
export type SectionContent = z.infer<typeof SectionContentSchema>;

/**
 * The contracts-side twin of the renderer's `never` check (architecture.md §5): adding a
 * member to `SECTION_TYPES` without a content variant makes this line fail to compile,
 * rather than producing a section that validates and renders as nothing.
 */
type SectionTypeWithoutContent = Exclude<SectionType, SectionContent["type"]>;
export const EVERY_SECTION_TYPE_HAS_CONTENT: SectionTypeWithoutContent extends never
  ? true
  : never = true;
