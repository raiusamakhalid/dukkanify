import { Inject, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { StoreBlueprint } from '@dukkanify/contracts';
import { ValidationError } from '../../../../common/errors/domain.error';
import { Page } from '../../domain/entities/page.entity';
import { Product } from '../../domain/entities/product.entity';
import { Section } from '../../domain/entities/section.entity';
import { Category, Store } from '../../domain/entities/store.entity';
import {
  STORE_REPOSITORY,
  type StoreRepositoryPort,
} from '../../domain/ports/store.repository.port';
import { Money } from '../../domain/value-objects/money.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { loadOwnedStore } from '../load-owned-store';

/** What a store is called when its name yields no URL at all — an Arabic one, typically. */
const FALLBACK_SLUG = 'store';

/** Tried as `name-2` … `name-5` before falling back to a random suffix. */
const MAX_NUMBERED_SLUG_ATTEMPTS = 5;

/**
 * Stamped on a store that arrived through `POST /store` rather than from the generator.
 * `promptVersion` exists to attribute output quality to a prompt revision (§7); saying
 * "none of ours produced this" is the honest value, and better than borrowing a version
 * number that would make a hand-written store look like generated output.
 */
export const MANUAL_PROMPT_VERSION = 'manual';

export interface SaveStoreInput {
  ownerId: string;
  /** Present to replace a store the caller owns; absent to create one. */
  storeId?: string;
  prompt: string;
  promptVersion: string;
  blueprint: StoreBlueprint;
}

/**
 * Turns a validated blueprint into a persisted store.
 *
 * This is the single write path: `POST /store` reaches it directly and generation will reach
 * it with the blueprint a model produced, so there is one place that decides how a blueprint
 * becomes rows. Everything the blueprint deliberately omits is decided here rather than
 * asked of a language model (architecture.md §7) — ids, the globally unique slug, positions,
 * and which category each product's slug refers to.
 */
@Injectable()
export class SaveStoreUseCase {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepositoryPort,
  ) {}

  async execute(input: SaveStoreInput): Promise<Store> {
    const existing =
      input.storeId === undefined
        ? null
        : await loadOwnedStore(this.stores, input.storeId, input.ownerId);

    const { blueprint } = input;
    const categories = toCategories(blueprint);
    const categoryIdBySlug = new Map(
      categories.map((category) => [category.slug.value, category.id]),
    );

    const store = Store.create({
      id: existing?.id ?? newId(),
      ownerId: input.ownerId,
      name: blueprint.store.name,
      // A store keeps the URL it was first given. Renaming it should not break every link
      // to it, and re-deriving the slug on every save is how that happens.
      slug: existing?.slug ?? (await this.allocateSlug(blueprint.store.name)),
      tagline: blueprint.store.tagline,
      prompt: input.prompt,
      promptVersion: input.promptVersion,
      status: existing?.status ?? 'DRAFT',
      locale: blueprint.store.locale,
      theme: blueprint.theme,
      categories,
      products: toProducts(blueprint, categoryIdBySlug),
      pages: toPages(blueprint),
      ...(existing === null ? {} : { createdAt: existing.createdAt }),
    });

    return this.stores.save(store);
  }

  /**
   * Store slugs are globally unique, so the database is the only thing that can say whether
   * one is free. Numbered variants first because "oud-attar-2" is a URL a person can read;
   * a random suffix only when a name is popular enough that numbering is a losing race.
   */
  private async allocateSlug(name: string): Promise<Slug> {
    const base = Slug.tryFromText(name) ?? Slug.create(FALLBACK_SLUG);
    if (!(await this.stores.existsBySlug(base))) {
      return base;
    }

    for (let attempt = 2; attempt <= MAX_NUMBERED_SLUG_ATTEMPTS; attempt += 1) {
      const candidate = base.withSuffix(String(attempt));
      if (!(await this.stores.existsBySlug(candidate))) {
        return candidate;
      }
    }

    const candidate = base.withSuffix(randomBytes(3).toString('hex'));
    if (await this.stores.existsBySlug(candidate)) {
      throw new ValidationError(
        `Could not find a free web address for a store called "${name}". Try a different name.`,
      );
    }
    return candidate;
  }
}

/**
 * Ids are minted here, in the layer that is about to write them, because the domain has no
 * business knowing what an identifier looks like and an aggregate is not valid without one.
 */
function newId(): string {
  return randomUUID();
}

function toCategories(blueprint: StoreBlueprint): Category[] {
  return blueprint.categories.map((category) =>
    Category.create({
      id: newId(),
      name: category.name,
      slug: Slug.create(category.slug),
    }),
  );
}

function toProducts(
  blueprint: StoreBlueprint,
  categoryIdBySlug: ReadonlyMap<string, string>,
): Product[] {
  return blueprint.products.map((product) =>
    Product.create({
      id: newId(),
      // The blueprint contract already refuses a dangling reference and the aggregate checks
      // it again; `null` here is the shape of "no category", not a silent repair.
      categoryId: categoryIdBySlug.get(product.categorySlug) ?? null,
      name: product.name,
      description: product.description,
      // One store, one currency — the only place a JSON number becomes money.
      price: Money.fromNumber(product.price, blueprint.store.currency),
      sku: product.sku,
      // The blueprint carries no image links on purpose: a model inventing URLs produces
      // broken images. The storefront renders a placeholder until real assets exist.
      imageUrl: null,
    }),
  );
}

function toPages(blueprint: StoreBlueprint): Page[] {
  return blueprint.pages.map((page) =>
    Page.create({
      id: newId(),
      type: page.type,
      title: page.title,
      slug: Slug.create(page.slug),
      sections: page.sections.map((content) =>
        Section.create({ id: newId(), content }),
      ),
    }),
  );
}
