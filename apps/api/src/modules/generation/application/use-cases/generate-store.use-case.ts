import { Injectable, Logger } from '@nestjs/common';
import {
  MAX_PROMPT_LENGTH,
  MIN_PROMPT_LENGTH,
  type Locale,
  type PageType,
  type StoreBlueprint,
} from '@dukkanify/contracts';
import { ValidationError } from '../../../../common/errors/domain.error';
import type { Store } from '../../../stores/domain/entities/store.entity';
import { SaveStoreUseCase } from '../../../stores/application/use-cases/save-store.use-case';
import { BlueprintRepairService } from '../services/blueprint-repair.service';

/** One page per type, so the URL is decided here rather than guessed by a model. */
const CANONICAL_PAGE_SLUG: Record<PageType, string> = {
  HOME: 'home',
  ABOUT: 'about',
  CONTACT: 'contact',
};

/** Room for a `-99` disambiguator inside the 32-character SKU limit. */
const MAX_SKU_STEM = 29;

export interface GenerateStoreInput {
  ownerId: string;
  prompt: string;
  locale: Locale;
}

/**
 * Prompt in, persisted storefront out.
 *
 * The shape of this use case is the argument in architecture.md §7: ask the model for the
 * parts only a model can invent, then let code guarantee everything code can guarantee.
 * Validation and the repair turn belong to `BlueprintRepairService`; ids, slugs, money and
 * the transaction belong to `SaveStoreUseCase`; what is left here is the normalisation in
 * between, and the decision to stamp the prompt revision that produced it.
 */
@Injectable()
export class GenerateStoreUseCase {
  private readonly logger = new Logger(GenerateStoreUseCase.name);

  constructor(
    private readonly blueprints: BlueprintRepairService,
    private readonly saveStore: SaveStoreUseCase,
  ) {}

  async execute(input: GenerateStoreInput): Promise<Store> {
    const prompt = sanitisePrompt(input.prompt);

    const produced = await this.blueprints.produce({
      prompt,
      locale: input.locale,
    });

    const store = await this.saveStore.execute({
      ownerId: input.ownerId,
      prompt,
      promptVersion: produced.promptVersion,
      blueprint: normalise(produced.blueprint),
    });

    this.logger.log(
      `Generated store ${store.id} for owner ${input.ownerId} ` +
        `(${String(produced.attempts)} attempt(s), promptVersion ${produced.promptVersion})`,
    );
    return store;
  }
}

/**
 * The prompt reaches a third party and a database, so it is cleaned before either.
 *
 * Control and format characters are stripped rather than rejected: a pasted prompt carrying
 * a zero-width joiner or a stray newline is a normal thing for a person to do, and failing
 * their request over an invisible character would be baffling. A null byte, meanwhile, is
 * something PostgreSQL will not store at all.
 */
function sanitisePrompt(raw: string): string {
  const cleaned = raw
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < MIN_PROMPT_LENGTH) {
    throw new ValidationError(
      `Describe the store you want in at least ${String(MIN_PROMPT_LENGTH)} characters.`,
    );
  }
  if (cleaned.length > MAX_PROMPT_LENGTH) {
    throw new ValidationError(
      `Keep the description under ${String(MAX_PROMPT_LENGTH)} characters.`,
    );
  }
  return cleaned;
}

/**
 * Deterministic post-processing: the two things the contract cannot express.
 *
 * `StoreBlueprintSchema` already guarantees the rest — eight products, three page types,
 * unique category slugs, every product pointing at a category that exists. Re-implementing
 * those here would be a second opinion free to disagree with the first. What it cannot
 * check are the database's own uniqueness rules, because they are per store rather than per
 * document: `@@unique([storeId, sku])` and `@@unique([storeId, slug])` on pages (§6).
 * Fixing those in code is cheaper and more reliable than another round trip to a model.
 */
function normalise(blueprint: StoreBlueprint): StoreBlueprint {
  return {
    ...blueprint,
    products: withDistinctSkus(blueprint.products),
    pages: blueprint.pages.map((page) => ({
      ...page,
      slug: CANONICAL_PAGE_SLUG[page.type],
    })),
  };
}

function withDistinctSkus(
  products: StoreBlueprint['products'],
): StoreBlueprint['products'] {
  const taken = new Set<string>();

  return products.map((product) => {
    if (!taken.has(product.sku)) {
      taken.add(product.sku);
      return product;
    }

    const stem = product.sku.slice(0, MAX_SKU_STEM).replace(/-+$/, '');
    for (let suffix = 2; ; suffix += 1) {
      const candidate = `${stem}-${String(suffix)}`;
      if (!taken.has(candidate)) {
        taken.add(candidate);
        return { ...product, sku: candidate };
      }
    }
  });
}
