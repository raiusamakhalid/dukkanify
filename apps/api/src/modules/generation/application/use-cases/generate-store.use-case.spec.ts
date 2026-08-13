import { PRODUCTS_PER_STORE } from '@dukkanify/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { PROMPT } from '../../../../../test/blueprint.fixture';
import { InMemoryStores } from '../../../../../test/in-memory-store.repository';
import {
  ScriptedGenerator,
  mockBlueprint,
} from '../../../../../test/scripted-generator';
import {
  BlueprintGenerationFailedError,
  ValidationError,
} from '../../../../common/errors/domain.error';
import { SaveStoreUseCase } from '../../../stores/application/use-cases/save-store.use-case';
import type { AiGeneratorPort } from '../../domain/ports/ai-generator.port';
import { MockGenerator } from '../../infrastructure/providers/mock.generator';
import { MOCK_PROMPT_VERSION } from '../../infrastructure/prompts/prompt.version';
import { BlueprintRepairService } from '../services/blueprint-repair.service';
import { GenerateStoreUseCase } from './generate-store.use-case';

/**
 * The whole generation path — prompt in, persisted storefront out — with no infrastructure.
 *
 * The model is `MockGenerator`, a real adapter behind `AiGeneratorPort`, and the database is
 * a Map behind `StoreRepositoryPort`. Nothing here reaches a network or a Postgres, which is
 * the point architecture.md §13 makes: the rules worth testing live in the application layer,
 * so the layer below can be swapped for something that runs in milliseconds.
 */

const OWNER = 'user-1';

let stores: InMemoryStores;

beforeEach(() => {
  stores = new InMemoryStores();
});

function generateWith(generator: AiGeneratorPort): GenerateStoreUseCase {
  return new GenerateStoreUseCase(
    new BlueprintRepairService(generator),
    new SaveStoreUseCase(stores),
  );
}

describe('GenerateStoreUseCase', () => {
  it('turns a prompt into a persisted storefront, with a Map for a database', async () => {
    const store = await generateWith(new MockGenerator()).execute({
      ownerId: OWNER,
      prompt: PROMPT,
      locale: 'en',
    });

    expect(stores.rows.get(store.id)).toBe(store);
    expect(store.ownerId).toBe(OWNER);
    expect(store.slug.value).not.toBe('');
    expect(store.products).toHaveLength(PRODUCTS_PER_STORE);
    expect(store.pages.map((page) => page.type)).toEqual([
      'HOME',
      'ABOUT',
      'CONTACT',
    ]);
  });

  it('attributes the store to the prompt revision that produced it', async () => {
    const store = await generateWith(new MockGenerator()).execute({
      ownerId: OWNER,
      prompt: PROMPT,
      locale: 'en',
    });

    // Reported by the adapter, never by configuration: a mock store must not be
    // attributable to a hosted prompt that never ran (§7).
    expect(store.promptVersion).toBe(MOCK_PROMPT_VERSION);
  });

  it('carries the locale through, so an Arabic store is stored right-to-left', async () => {
    const store = await generateWith(new MockGenerator()).execute({
      ownerId: OWNER,
      prompt: 'متجر عطور فاخر لعملاء الإمارات',
      locale: 'ar',
    });

    expect(store.locale).toBe('ar');
    // Derived from the locale rather than stored beside it, so the two cannot drift.
    expect(store.direction).toBe('RTL');
  });

  it('gives each page the address the application decides, not the one suggested', async () => {
    const blueprint = await mockBlueprint();
    const renamed = {
      ...blueprint,
      pages: blueprint.pages.map((page) => ({ ...page, slug: 'welcome' })),
    };

    const store = await generateWith(new ScriptedGenerator([renamed])).execute({
      ownerId: OWNER,
      prompt: PROMPT,
      locale: 'en',
    });

    // `@@unique([storeId, slug])` would refuse three pages called `welcome`, and the URL of
    // an About page is not a thing a model should be inventing anyway.
    expect(store.pages.map((page) => page.slug.value)).toEqual([
      'home',
      'about',
      'contact',
    ]);
  });

  it('renames a repeated SKU rather than losing the product', async () => {
    const blueprint = await mockBlueprint();
    const collided = {
      ...blueprint,
      products: blueprint.products.map((product) => ({
        ...product,
        sku: 'OUD-ROYAL-01',
      })),
    };

    const store = await generateWith(new ScriptedGenerator([collided])).execute(
      { ownerId: OWNER, prompt: PROMPT, locale: 'en' },
    );

    const skus = store.products.map((product) => product.sku);
    expect(skus).toHaveLength(PRODUCTS_PER_STORE);
    expect(new Set(skus).size).toBe(PRODUCTS_PER_STORE);
    expect(skus[1]).toBe('OUD-ROYAL-01-2');
  });

  it('cleans the prompt before it reaches the model or the database', async () => {
    const generator = new ScriptedGenerator([await mockBlueprint()]);

    const store = await generateWith(generator).execute({
      ownerId: OWNER,
      // What a pasted prompt actually looks like: padded, wrapped across two lines, with a
      // zero-width space in it. Escaped rather than typed, so no editor can silently fix it.
      prompt: '  Create a luxury\u200B perfume store\nfor UAE customers  ',
      locale: 'en',
    });

    expect(generator.requests[0]?.prompt).toBe(PROMPT);
    expect(store.prompt).toBe(PROMPT);
  });

  it('refuses a prompt that says nothing once the invisible characters are gone', async () => {
    const generator = new ScriptedGenerator([await mockBlueprint()]);

    await expect(
      generateWith(generator).execute({
        ownerId: OWNER,
        // Two zero-width spaces and a null byte, which PostgreSQL will not store at all.
        prompt: '  \u200B\u200B oud \u0000 ',
        locale: 'en',
      }),
    ).rejects.toThrow(ValidationError);
    // Rejected here, so nothing is paid for and no third party sees the prompt.
    expect(generator.requests).toHaveLength(0);
  });

  it('refuses a prompt longer than the contract allows', async () => {
    const generator = new ScriptedGenerator([await mockBlueprint()]);

    await expect(
      generateWith(generator).execute({
        ownerId: OWNER,
        prompt: 'oud '.repeat(200),
        locale: 'en',
      }),
    ).rejects.toThrow(ValidationError);
    expect(generator.requests).toHaveLength(0);
  });

  it('persists a repaired blueprint exactly like a first-attempt one', async () => {
    const generator = new ScriptedGenerator([
      { store: { name: 'Half a store' } },
      await mockBlueprint(),
    ]);

    const store = await generateWith(generator).execute({
      ownerId: OWNER,
      prompt: PROMPT,
      locale: 'en',
    });

    expect(generator.requests).toHaveLength(2);
    expect(generator.requests[1]?.repair?.issues.length).toBeGreaterThan(0);
    expect(stores.rows.get(store.id)?.products).toHaveLength(
      PRODUCTS_PER_STORE,
    );
  });

  it('writes nothing when the model never satisfies the contract', async () => {
    await expect(
      generateWith(new ScriptedGenerator(['not a blueprint'])).execute({
        ownerId: OWNER,
        prompt: PROMPT,
        locale: 'en',
      }),
    ).rejects.toThrow(BlueprintGenerationFailedError);

    // A half-written store is worse than none: the caller retries and finds a stub in
    // their dashboard. The write happens after validation for exactly this reason.
    expect(stores.rows.size).toBe(0);
  });
});
