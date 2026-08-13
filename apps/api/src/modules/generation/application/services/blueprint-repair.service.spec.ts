import type { StoreBlueprint } from '@dukkanify/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { PROMPT } from '../../../../../test/blueprint.fixture';
import {
  SCRIPTED_PROMPT_VERSION,
  ScriptedGenerator,
  mockBlueprint,
} from '../../../../../test/scripted-generator';
import { BlueprintGenerationFailedError } from '../../../../common/errors/domain.error';
import type {
  AiGeneratorPort,
  GeneratedBlueprint,
} from '../../domain/ports/ai-generator.port';
import { BlueprintRepairService } from './blueprint-repair.service';

/**
 * The repair turn, with the model replaced by a script of answers.
 *
 * No network and no key: the port is what makes "what happens when the model returns
 * nonsense twice" a unit test rather than a story told during code review.
 */

let good: StoreBlueprint;

beforeEach(async () => {
  good = await mockBlueprint();
});

describe('BlueprintRepairService', () => {
  it('accepts a first attempt that satisfies the contract, without a second call', async () => {
    const generator = new ScriptedGenerator([good]);

    const produced = await new BlueprintRepairService(generator).produce({
      prompt: PROMPT,
      locale: 'en',
    });

    expect(produced.attempts).toBe(1);
    expect(produced.promptVersion).toBe(SCRIPTED_PROMPT_VERSION);
    expect(generator.requests).toHaveLength(1);
    expect(generator.requests[0]?.repair).toBeUndefined();
  });

  it('repairs a malformed first attempt and returns the corrected blueprint', async () => {
    const generator = new ScriptedGenerator(['not a blueprint at all', good]);

    const produced = await new BlueprintRepairService(generator).produce({
      prompt: PROMPT,
      locale: 'en',
    });

    expect(produced.attempts).toBe(2);
    expect(produced.blueprint.products).toHaveLength(8);
  });

  it('hands the repair turn the previous output and the exact faults', async () => {
    const sevenProducts = { ...good, products: good.products.slice(0, 7) };
    const generator = new ScriptedGenerator([sevenProducts, good]);

    await new BlueprintRepairService(generator).produce({
      prompt: PROMPT,
      locale: 'en',
    });

    const repair = generator.requests[1]?.repair;
    expect(repair?.previous).toBe(sevenProducts);
    expect(repair?.issues.some((issue) => issue.path === 'products')).toBe(
      true,
    );
  });

  it('gives up after two attempts with a 422, not a 500', async () => {
    const generator = new ScriptedGenerator([{ store: {} }, { store: {} }]);

    await expect(
      new BlueprintRepairService(generator).produce({
        prompt: PROMPT,
        locale: 'en',
      }),
    ).rejects.toThrow(BlueprintGenerationFailedError);
    expect(generator.requests).toHaveLength(2);
  });

  it('reports which fields were wrong, so the client can say something useful', async () => {
    const generator = new ScriptedGenerator([{}, {}]);

    const thrown: unknown = await new BlueprintRepairService(generator)
      .produce({ prompt: PROMPT, locale: 'en' })
      .catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(BlueprintGenerationFailedError);
    if (thrown instanceof BlueprintGenerationFailedError) {
      // `details` is `unknown` on a DomainError by design — it is whatever the failure had
      // to say. Reading it back as JSON asserts the shape without pretending to know it.
      expect(JSON.stringify(thrown.details)).toContain('"path":"store"');
    }
  });

  it('lets a provider outage travel untouched, so it stays a 503', async () => {
    const outage = new Error('connection refused');
    const generator: AiGeneratorPort = {
      generate: (): Promise<GeneratedBlueprint> => Promise.reject(outage),
    };

    await expect(
      new BlueprintRepairService(generator).produce({
        prompt: PROMPT,
        locale: 'en',
      }),
    ).rejects.toBe(outage);
  });
});
