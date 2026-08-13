import { z } from "zod";
import {
  DirectionSchema,
  PageTypeSchema,
  SectionTypeSchema,
  StoreStatusSchema,
} from "./enums";
import {
  CurrencySchema,
  IdSchema,
  IsoDateTimeSchema,
  LocaleSchema,
  MoneyStringSchema,
  SkuSchema,
  SlugSchema,
} from "./primitives";
import { SectionContentSchema } from "./section.schema";
import { ThemeTokensSchema } from "./theme.schema";

/**
 * What crosses the API boundary. These are not the blueprint and not the Prisma models:
 * ids exist, timestamps are ISO strings, prices are fixed-point strings, and nullable
 * columns are `null` rather than absent so a client never has to guess which it got.
 */

/** The longest prompt the generator accepts. The use case guards on it; the UI counts to it. */
export const MAX_PROMPT_LENGTH = 500;
export const MIN_PROMPT_LENGTH = 10;

export const UserDtoSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type UserDto = z.infer<typeof UserDtoSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: UserDtoSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const CategoryDtoSchema = z.object({
  id: IdSchema,
  name: z.string(),
  slug: SlugSchema,
  position: z.number().int().nonnegative(),
});
export type CategoryDto = z.infer<typeof CategoryDtoSchema>;

export const ProductDtoSchema = z.object({
  id: IdSchema,
  categoryId: IdSchema.nullable(),
  name: z.string(),
  description: z.string(),
  price: MoneyStringSchema,
  currency: CurrencySchema,
  sku: SkuSchema,
  imageUrl: z.string().nullable(),
});
export type ProductDto = z.infer<typeof ProductDtoSchema>;

export const SectionDtoSchema = z.object({
  id: IdSchema,
  type: SectionTypeSchema,
  position: z.number().int().nonnegative(),
  content: SectionContentSchema,
});
export type SectionDto = z.infer<typeof SectionDtoSchema>;

export const PageDtoSchema = z.object({
  id: IdSchema,
  type: PageTypeSchema,
  title: z.string(),
  slug: SlugSchema,
  position: z.number().int().nonnegative(),
  sections: z.array(SectionDtoSchema),
});
export type PageDto = z.infer<typeof PageDtoSchema>;

/** The dashboard list shape: enough to render a card, nothing more to transfer. */
export const StoreSummaryDtoSchema = z.object({
  id: IdSchema,
  name: z.string(),
  slug: SlugSchema,
  tagline: z.string().nullable(),
  status: StoreStatusSchema,
  locale: LocaleSchema,
  direction: DirectionSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type StoreSummaryDto = z.infer<typeof StoreSummaryDtoSchema>;

/** The builder and storefront shape: one request renders an entire store. */
export const StoreDtoSchema = StoreSummaryDtoSchema.extend({
  prompt: z.string(),
  promptVersion: z.string(),
  theme: ThemeTokensSchema,
  categories: z.array(CategoryDtoSchema),
  products: z.array(ProductDtoSchema),
  pages: z.array(PageDtoSchema),
});
export type StoreDto = z.infer<typeof StoreDtoSchema>;

export const GenerateRequestSchema = z.object({
  prompt: z.string().trim().min(MIN_PROMPT_LENGTH).max(MAX_PROMPT_LENGTH),
  locale: LocaleSchema.default("en"),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
