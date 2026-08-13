import {
  StoreBlueprintSchema,
  type StoreBlueprint,
} from '@dukkanify/contracts';
import type {
  AiGeneratorPort,
  BlueprintGenerationRequest,
  GeneratedBlueprint,
} from '../src/modules/generation/domain/ports/ai-generator.port';
import { MockGenerator } from '../src/modules/generation/infrastructure/providers/mock.generator';
import { PROMPT } from './blueprint.fixture';

/**
 * The two things every test of the generation path needs: a model under the test's control,
 * and something valid for it to say.
 *
 * `AiGeneratorPort` is what makes both possible (architecture.md §7). "What happens when the
 * model answers with nonsense twice" is a question about the application layer, and a port
 * turns it into a unit test that needs no key, no network and no patience.
 */

/**
 * Not a real prompt revision. It exists so a test can assert that the version stamped on a
 * store came from the adapter that generated it rather than from configuration.
 */
export const SCRIPTED_PROMPT_VERSION = 'test.1';

/** A provider that records what it was asked and answers a prepared script. */
export class ScriptedGenerator implements AiGeneratorPort {
  readonly requests: BlueprintGenerationRequest[] = [];

  constructor(private readonly answers: readonly unknown[]) {}

  generate(request: BlueprintGenerationRequest): Promise<GeneratedBlueprint> {
    this.requests.push(request);
    // The last answer repeats, so a single-answer script fails the repair turn the same way
    // it failed the first attempt — which is what a model that cannot satisfy the contract
    // actually does, and it saves every such test from writing the same answer twice.
    const index = Math.min(this.requests.length - 1, this.answers.length - 1);
    return Promise.resolve({
      raw: this.answers[index],
      promptVersion: SCRIPTED_PROMPT_VERSION,
    });
  }
}

/**
 * A blueprint the contract accepts, taken from the mock adapter rather than written out a
 * third time. Tests that need a specific fault mutate this, so the fault is then the only
 * difference between a failing generation and a good one.
 */
export async function mockBlueprint(): Promise<StoreBlueprint> {
  const { raw } = await new MockGenerator().generate({
    prompt: PROMPT,
    locale: 'en',
  });
  return StoreBlueprintSchema.parse(raw);
}
