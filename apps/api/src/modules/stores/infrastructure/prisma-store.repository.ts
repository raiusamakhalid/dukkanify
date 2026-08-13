import { Injectable } from '@nestjs/common';
import { CurrencySchema, LocaleSchema } from '@dukkanify/contracts';
import {
  NotFoundError,
  ValidationError,
} from '../../../common/errors/domain.error';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { Page } from '../domain/entities/page.entity';
import { Product } from '../domain/entities/product.entity';
import { Section } from '../domain/entities/section.entity';
import { Category, Store } from '../domain/entities/store.entity';
import { parseOrThrow } from '../domain/invariants';
import type {
  StoreRepositoryPort,
  StoreSummary,
} from '../domain/ports/store.repository.port';
import { Money } from '../domain/value-objects/money.vo';
import { Slug } from '../domain/value-objects/slug.vo';

/** Everything an aggregate needs, in the order the domain expects to receive it. */
const FULL_STORE_INCLUDE = {
  categories: { orderBy: { position: 'asc' } },
  // Products carry no position column (§6); the SKU is unique per store, so ordering by it
  // is stable across reads — which a catalogue that renders the same way twice requires.
  products: { orderBy: { sku: 'asc' } },
  pages: {
    orderBy: { position: 'asc' },
    include: { sections: { orderBy: { position: 'asc' } } },
  },
} as const satisfies Prisma.StoreInclude;

type StoreRow = Prisma.StoreGetPayload<{ include: typeof FULL_STORE_INCLUDE }>;

const SUMMARY_COLUMNS = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  status: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.StoreSelect;

type SummaryRow = Prisma.StoreGetPayload<{ select: typeof SUMMARY_COLUMNS }>;

/**
 * The only class in this module that knows PostgreSQL exists.
 *
 * It owns both halves of the persistence boundary: rows to aggregates on the way in, and
 * aggregates to statements on the way out. The domain never sees a `Decimal`, a `JsonValue`
 * or a `position` column, and `application/` never imports this file — which is what the §3
 * grep checks and the reason a use case can be tested with a fake in a millisecond.
 */
@Injectable()
export class PrismaStoreRepository implements StoreRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One transaction, whole aggregate.
   *
   * The children are deleted and rewritten rather than diffed: a store is generated and
   * replaced as a unit, and a diffing writer would be a great deal of code guarding against
   * a case this product does not have. On a first save the deletes match nothing, which
   * costs three no-op statements and keeps create and replace on one path.
   */
  async save(store: Store): Promise<Store> {
    try {
      return await this.writeAggregate(store);
    } catch (error) {
      // Two stores of the same name saved in the same instant: the slug the use case found
      // free was taken between the check and the write. The database is the only thing that
      // can settle it, and a lost race is a 400 the caller can act on — not a 500.
      if (isUniqueViolation(error, 'slug')) {
        throw new ValidationError(
          `The web address "${store.slug.value}" was just taken. Try saving again.`,
        );
      }
      throw error;
    }
  }

  private writeAggregate(store: Store): Promise<Store> {
    return this.prisma.$transaction(async (tx) => {
      await tx.store.upsert({
        where: { id: store.id },
        create: {
          id: store.id,
          ownerId: store.ownerId,
          ...writableStoreColumns(store),
        },
        // `ownerId` is absent on purpose: a save cannot hand a store to another account.
        update: writableStoreColumns(store),
      });

      await tx.product.deleteMany({ where: { storeId: store.id } });
      await tx.category.deleteMany({ where: { storeId: store.id } });
      // Sections go with their pages — `onDelete: Cascade` in §6.
      await tx.page.deleteMany({ where: { storeId: store.id } });

      await tx.category.createMany({ data: categoryRows(store) });
      await tx.product.createMany({ data: productRows(store) });
      await tx.page.createMany({ data: pageRows(store) });
      await tx.section.createMany({ data: sectionRows(store) });

      const row = await tx.store.findUnique({
        where: { id: store.id },
        include: FULL_STORE_INCLUDE,
      });
      if (row === null) {
        throw new NotFoundError('Store', store.id);
      }
      // Read back rather than returning what was passed in: `updatedAt` is the database's
      // to decide, and a caller that trusts the write is a caller that never sees a trigger.
      return toStore(row);
    });
  }

  async findById(storeId: string): Promise<Store | null> {
    const row = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: FULL_STORE_INCLUDE,
    });
    return row === null ? null : toStore(row);
  }

  async findBySlug(slug: Slug): Promise<Store | null> {
    const row = await this.prisma.store.findUnique({
      where: { slug: slug.value },
      include: FULL_STORE_INCLUDE,
    });
    return row === null ? null : toStore(row);
  }

  async listByOwner(ownerId: string): Promise<readonly StoreSummary[]> {
    const rows = await this.prisma.store.findMany({
      where: { ownerId },
      select: SUMMARY_COLUMNS,
      // Newest first, served by the `@@index([ownerId, createdAt])` the schema declares.
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toStoreSummary);
  }

  async existsBySlug(slug: Slug): Promise<boolean> {
    const row = await this.prisma.store.findUnique({
      where: { slug: slug.value },
      select: { id: true },
    });
    return row !== null;
  }

  async saveSection(storeId: string, section: Section): Promise<void> {
    // Matched through its page's store as well as its id: the use case has already checked
    // ownership, and a write that cannot be aimed at another store cannot be aimed there by
    // a future caller that forgets to.
    const result = await this.prisma.section.updateMany({
      where: { id: section.id, page: { storeId } },
      data: { type: section.type, content: section.content },
    });
    if (result.count === 0) {
      throw new NotFoundError('Section', section.id);
    }
  }
}

/** Prisma's code for a unique-constraint failure, with the offending columns in `meta`. */
const UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(error: unknown, column: string): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== UNIQUE_VIOLATION
  ) {
    return false;
  }
  const target: unknown = error.meta?.['target'];
  return Array.isArray(target) && target.includes(column);
}

function writableStoreColumns(
  store: Store,
): Omit<Prisma.StoreUncheckedCreateInput, 'id' | 'ownerId'> {
  return {
    name: store.name,
    slug: store.slug.value,
    tagline: store.tagline,
    prompt: store.prompt,
    promptVersion: store.promptVersion,
    status: store.status,
    locale: store.locale,
    // Stored because the column exists for querying and for the storefront's `dir`; the
    // domain derives it, so this write is the only direction it ever travels.
    direction: store.direction,
    theme: store.theme,
  };
}

function categoryRows(store: Store): Prisma.CategoryCreateManyInput[] {
  return store.categories.map((category, position) => ({
    id: category.id,
    storeId: store.id,
    name: category.name,
    slug: category.slug.value,
    position,
  }));
}

function productRows(store: Store): Prisma.ProductCreateManyInput[] {
  return store.products.map((product) => ({
    id: product.id,
    storeId: store.id,
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    // A fixed-point string into a `Decimal(10,2)` column. Handing Prisma a JavaScript number
    // here is the one line that would put binary floating point back into the price.
    price: product.price.toDecimalString(),
    currency: product.price.currency,
    sku: product.sku,
    imageUrl: product.imageUrl,
  }));
}

function pageRows(store: Store): Prisma.PageCreateManyInput[] {
  return store.pages.map((page, position) => ({
    id: page.id,
    storeId: store.id,
    type: page.type,
    title: page.title,
    slug: page.slug.value,
    position,
  }));
}

/** The one place the `type` column is written, and it is written from the content (§6). */
function sectionRows(store: Store): Prisma.SectionCreateManyInput[] {
  return store.pages.flatMap((page) =>
    page.sections.map((section, position) => ({
      id: section.id,
      pageId: page.id,
      type: section.type,
      position,
      content: section.content,
    })),
  );
}

function toStore(row: StoreRow): Store {
  const categories = row.categories.map((category) =>
    Category.create({
      id: category.id,
      name: category.name,
      slug: Slug.create(category.slug),
    }),
  );

  return Store.create({
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    slug: Slug.create(row.slug),
    tagline: row.tagline,
    prompt: row.prompt,
    promptVersion: row.promptVersion,
    status: row.status,
    // `locale` is a plain text column, so it is checked here rather than trusted: a row
    // written before a locale was added to the contract must not become a broken storefront.
    locale: parseOrThrow(LocaleSchema, row.locale, 'locale'),
    theme: row.theme,
    categories,
    products: row.products.map(toProduct),
    pages: row.pages.map(toPage),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function toProduct(row: StoreRow['products'][number]): Product {
  return Product.create({
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    // Decimal to a fixed-point string to `Money`, never through a float.
    price: Money.fromDecimalString(
      row.price.toFixed(2),
      parseOrThrow(CurrencySchema, row.currency, 'currency'),
    ),
    sku: row.sku,
    imageUrl: row.imageUrl,
  });
}

function toPage(row: StoreRow['pages'][number]): Page {
  return Page.create({
    id: row.id,
    type: row.type,
    title: row.title,
    slug: Slug.create(row.slug),
    sections: row.sections.map((section) =>
      // The stored `type` column is ignored: `Section` derives it from the content, so a row
      // whose two halves ever disagreed resolves to the half that renders.
      Section.create({ id: section.id, content: section.content }),
    ),
  });
}

function toStoreSummary(row: SummaryRow): StoreSummary {
  return {
    id: row.id,
    name: row.name,
    slug: Slug.create(row.slug),
    tagline: row.tagline,
    status: row.status,
    locale: parseOrThrow(LocaleSchema, row.locale, 'locale'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
