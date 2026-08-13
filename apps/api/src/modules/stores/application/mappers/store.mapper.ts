import type {
  CategoryDto,
  PageDto,
  ProductDto,
  SectionDto,
  StoreDto,
  StoreSummaryDto,
} from '@dukkanify/contracts';
import { directionForLocale } from '@dukkanify/contracts';
import type { Category, Store } from '../../domain/entities/store.entity';
import type { Page } from '../../domain/entities/page.entity';
import type { Product } from '../../domain/entities/product.entity';
import type { Section } from '../../domain/entities/section.entity';
import type { StoreSummary } from '../../domain/ports/store.repository.port';

/**
 * Domain aggregate to wire shape.
 *
 * The other half of the journey — a database row to an aggregate — lives in the repository,
 * because it is the only place allowed to know what a Prisma row looks like (architecture.md
 * §3). Splitting the mapping at the layer boundary is what keeps `application/` free of the
 * persistence types, and it is the reason the §3 grep passes rather than merely looks like
 * it should.
 *
 * Nothing here reads a field the DTO does not declare, so no timestamp, owner id or internal
 * flag can leak by being adjacent to something that was wanted.
 */

export function toStoreDto(store: Store): StoreDto {
  return {
    ...toStoreSummaryDto(store),
    prompt: store.prompt,
    promptVersion: store.promptVersion,
    theme: store.theme,
    categories: store.categories.map(toCategoryDto),
    products: store.products.map(toProductDto),
    pages: store.pages.map(toPageDto),
  };
}

/**
 * Takes either the aggregate or the list projection: both carry exactly these fields, and a
 * dashboard card rendered from a full store must not differ from one rendered from a list.
 */
export function toStoreSummaryDto(store: StoreSummary): StoreSummaryDto {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug.value,
    tagline: store.tagline,
    status: store.status,
    locale: store.locale,
    // Derived here as it is in the domain, so the wire cannot carry a direction that
    // disagrees with the locale beside it.
    direction: directionForLocale(store.locale),
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
  };
}

function toCategoryDto(category: Category, position: number): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug.value,
    position,
  };
}

function toProductDto(product: Product): ProductDto {
  return {
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    // A fixed-point string, never a float: this is the boundary CLAUDE.md's money rule is
    // about, and `Money` is the only thing that knows how to cross it.
    price: product.price.toDecimalString(),
    currency: product.price.currency,
    sku: product.sku,
    imageUrl: product.imageUrl,
  };
}

function toPageDto(page: Page, position: number): PageDto {
  return {
    id: page.id,
    type: page.type,
    title: page.title,
    slug: page.slug.value,
    position,
    sections: page.sections.map(toSectionDto),
  };
}

/** Position is the index in the page — the array is the order (see `Page`). */
export function toSectionDto(section: Section, position: number): SectionDto {
  return {
    id: section.id,
    type: section.type,
    position,
    content: section.content,
  };
}
