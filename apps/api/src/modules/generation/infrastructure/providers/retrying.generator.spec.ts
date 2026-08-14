import { describe, expect, it, vi } from 'vitest';
import {
  AiProviderUnavailableError,
  BlueprintGenerationFailedError,
} from '../../../../common/errors/domain.error';
import type {
  AiGeneratorPort,
  BlueprintGenerationRequest,
  GeneratedBlueprint,
} from '../../domain/ports/ai-generator.port';
import { RetryingGenerator } from './retrying.generator';

/**
 * What matters here is the *policy*, not any vendor: which failures earn another attempt and
 * which are handed straight back. No SDK is imported, and `[0, 0]` keeps the suite instant.
 */

const REQUEST: BlueprintGenerationRequest = {
  prompt: 'Create a luxury perfume store for UAE customers',
  locale: 'en',
};

const BLUEPRINT: GeneratedBlueprint = {
  raw: { ok: true },
  promptVersion: 'v1',
};

/** Fails with `failures` in order, then succeeds. The mock is returned for assertions. */
function generatorThatFails(...failures: readonly Error[]) {
  let call = 0;
  const generate = vi.fn((): Promise<GeneratedBlueprint> => {
    const failure = failures[call];
    call += 1;
    return failure === undefined
      ? Promise.resolve(BLUEPRINT)
      : Promise.reject(failure);
  });
  const port: AiGeneratorPort = { generate };
  return { port, generate };
}

const noDelay = (port: AiGeneratorPort): RetryingGenerator =>
  new RetryingGenerator(port, [0, 0]);

describe('RetryingGenerator', () => {
  it('returns the inner result without retrying when the first attempt succeeds', async () => {
    const { port, generate } = generatorThatFails();

    await expect(noDelay(port).generate(REQUEST)).resolves.toEqual(BLUEPRINT);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure and succeeds on the next attempt', async () => {
    const { port, generate } = generatorThatFails(
      AiProviderUnavailableError.transient(),
    );

    await expect(noDelay(port).generate(REQUEST)).resolves.toEqual(BLUEPRINT);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('makes no more than the configured number of attempts, then rethrows', async () => {
    const last = AiProviderUnavailableError.transient();
    const { port, generate } = generatorThatFails(
      AiProviderUnavailableError.transient(),
      AiProviderUnavailableError.transient(),
      last,
    );

    // Two backoffs configured, so three attempts — and the caller sees the *last* failure.
    await expect(noDelay(port).generate(REQUEST)).rejects.toBe(last);
    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('does not retry a timeout, whose budget a second attempt cannot afford', async () => {
    const timedOut = new AiProviderUnavailableError(
      'The store generator took too long to respond. Please try again.',
    );
    const { port, generate } = generatorThatFails(timedOut);

    await expect(noDelay(port).generate(REQUEST)).rejects.toBe(timedOut);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('does not retry an exhausted quota, which a second attempt cannot clear', async () => {
    const quota = new AiProviderUnavailableError(
      'The store generator has reached its daily limit. Please try again tomorrow.',
    );
    const { port, generate } = generatorThatFails(quota);

    await expect(noDelay(port).generate(REQUEST)).rejects.toBe(quota);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('does not retry a blueprint the model got wrong — that is the repair turn’s job', async () => {
    const invalid = new BlueprintGenerationFailedError('cut short');
    const { port, generate } = generatorThatFails(invalid);

    await expect(noDelay(port).generate(REQUEST)).rejects.toBe(invalid);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('passes the request through untouched, repair context included', async () => {
    const { port, generate } = generatorThatFails(
      AiProviderUnavailableError.transient(),
    );
    const repairRequest: BlueprintGenerationRequest = {
      ...REQUEST,
      repair: {
        previous: { broken: true },
        issues: [{ path: 'products', message: 'must contain exactly 8 items' }],
      },
    };

    await noDelay(port).generate(repairRequest);

    expect(generate).toHaveBeenLastCalledWith(repairRequest);
  });

  it('waits between attempts', async () => {
    const { port } = generatorThatFails(AiProviderUnavailableError.transient());
    const startedAt = Date.now();

    await new RetryingGenerator(port, [40]).generate(REQUEST);

    // Jitter only ever adds, so the floor is the configured delay.
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(40);
  });
});
