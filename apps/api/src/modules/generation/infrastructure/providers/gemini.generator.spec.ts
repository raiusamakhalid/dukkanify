import { FinishReason, type GenerateContentResponse } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import {
  AiProviderUnavailableError,
  BlueprintGenerationFailedError,
} from '../../../../common/errors/domain.error';
import { AppConfig } from '../../../../config/configuration';
import { validateEnv } from '../../../../config/env.validation';
import { PROMPT_VERSION } from '../prompts/prompt.version';
import { type ContentGenerator, GeminiGenerator } from './gemini.generator';

/**
 * The adapter with the SDK replaced by a function. No network, no key, no quota spent.
 */

const config = new AppConfig(
  validateEnv({
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/dukkanify',
    JWT_SECRET: 'test-secret-that-is-long-enough-32chars',
    GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-key',
  }),
);

const REQUEST = {
  prompt: 'Create a luxury perfume store for UAE customers',
  locale: 'en',
} as const;

type GenerateMock = ContentGenerator['generateContent'];

/** Only the fields this adapter reads — the SDK's response class has forty more. */
function responding(
  body: Partial<GenerateContentResponse> & { text?: string },
): GenerateMock {
  const response = {
    candidates: [{ finishReason: FinishReason.STOP }],
    usageMetadata: {
      promptTokenCount: 900,
      candidatesTokenCount: 2600,
      thoughtsTokenCount: 0,
    },
    ...body,
  } as GenerateContentResponse;
  return vi.fn(() => Promise.resolve(response));
}

function failing(error: Error): GenerateMock {
  return vi.fn(() => Promise.reject(error));
}

/** The SDK's `ApiError` shape: an Error carrying the HTTP status and the response body. */
function apiError(status: number, body: string): Error {
  return Object.assign(new Error(body), { status });
}

const QUOTA_PER_MINUTE = JSON.stringify({
  error: {
    code: 429,
    status: 'RESOURCE_EXHAUSTED',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [
          { quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' },
        ],
      },
      {
        '@type': 'type.googleapis.com/google.rpc.RetryInfo',
        retryDelay: '27s',
      },
    ],
  },
});

const QUOTA_PER_DAY = JSON.stringify({
  error: {
    code: 429,
    status: 'RESOURCE_EXHAUSTED',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [
          { quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' },
        ],
      },
    ],
  },
});

describe('GeminiGenerator', () => {
  it('parses the JSON body and hands it on unvalidated', async () => {
    const blueprint = { store: { name: 'Dar Al Oud' } };
    const generateContent = responding({ text: JSON.stringify(blueprint) });

    const generated = await new GeminiGenerator(config, {
      generateContent,
    }).generate(REQUEST);

    expect(generated.raw).toEqual(blueprint);
    expect(generated.promptVersion).toBe(PROMPT_VERSION);
  });

  it('asks for JSON, spends no budget on thinking, and sends no response schema', async () => {
    const generateContent = responding({ text: '{}' });

    await new GeminiGenerator(config, { generateContent }).generate(REQUEST);

    const [params] = vi.mocked(generateContent).mock.calls[0] ?? [];
    expect(params?.model).toBe('gemini-3.5-flash');
    expect(params?.config.responseMimeType).toBe('application/json');
    expect(params?.config.thinkingConfig).toEqual({ thinkingBudget: 0 });
    // The blueprint schema is refused by the API and cannot express our formats anyway;
    // the contract is enforced by Zod and the repair turn instead.
    expect(params?.config).not.toHaveProperty('responseJsonSchema');
    expect(params?.config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('omits thinkingConfig on Flash-Lite, which rejects the field as 400', async () => {
    const lite = new AppConfig(
      validateEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dukkanify',
        JWT_SECRET: 'test-secret-that-is-long-enough-32chars',
        GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-key',
        AI_MODEL: 'gemini-3.5-flash-lite',
      }),
    );
    const generateContent = responding({ text: '{}' });

    await new GeminiGenerator(lite, { generateContent }).generate(REQUEST);

    const [params] = vi.mocked(generateContent).mock.calls[0] ?? [];
    expect(params?.model).toBe('gemini-3.5-flash-lite');
    expect(params?.config).not.toHaveProperty('thinkingConfig');
  });

  it('returns unparseable output as-is, so the repair turn can quote it back', async () => {
    const generateContent = responding({
      text: 'Sorry — here is your store: {oops',
    });

    const generated = await new GeminiGenerator(config, {
      generateContent,
    }).generate(REQUEST);

    // Not an error: the validator rejects a string and the repair turn shows the model
    // exactly what it sent. That is the difference between a repair turn and a retry.
    expect(generated.raw).toBe('Sorry — here is your store: {oops');
  });

  it('passes a schema violation through untouched, for the contract to judge', async () => {
    // Valid JSON, wrong shape — seven products where the contract demands eight. The
    // adapter must not have an opinion about this; `StoreBlueprintSchema` does.
    const wrongShape = { store: { name: 'Dar Al Oud' }, products: [1, 2, 3] };
    const generateContent = responding({ text: JSON.stringify(wrongShape) });

    const generated = await new GeminiGenerator(config, {
      generateContent,
    }).generate(REQUEST);

    expect(generated.raw).toEqual(wrongShape);
  });

  it('answers 422 when the answer was cut off mid-store', async () => {
    const generateContent = responding({
      candidates: [{ finishReason: FinishReason.MAX_TOKENS }],
      text: '{"store":{"nam',
    });

    await expect(
      new GeminiGenerator(config, { generateContent }).generate(REQUEST),
    ).rejects.toThrow(/cut short/i);
  });

  it('answers 422 when a filter leaves the response empty', async () => {
    const generateContent = responding({
      candidates: [{ finishReason: FinishReason.SAFETY }],
      text: '',
    });

    await expect(
      new GeminiGenerator(config, { generateContent }).generate(REQUEST),
    ).rejects.toThrow(BlueprintGenerationFailedError);
  });

  it('tells a per-minute rate limit apart, and quotes the retry delay', async () => {
    const generateContent = failing(apiError(429, QUOTA_PER_MINUTE));

    await expect(
      new GeminiGenerator(config, { generateContent }).generate(REQUEST),
    ).rejects.toThrow(/busy.*about 27 seconds/i);
  });

  it('tells an exhausted daily quota apart, because waiting a moment will not help', async () => {
    const generateContent = failing(apiError(429, QUOTA_PER_DAY));

    await expect(
      new GeminiGenerator(config, { generateContent }).generate(REQUEST),
    ).rejects.toThrow(/daily limit.*tomorrow/i);
  });

  it('still answers 503 for a 429 it cannot classify', async () => {
    const generateContent = failing(apiError(429, 'quota exceeded'));

    await expect(
      new GeminiGenerator(config, { generateContent }).generate(REQUEST),
    ).rejects.toThrow(AiProviderUnavailableError);
  });

  it('answers 503 when the API is unreachable', async () => {
    const generateContent = failing(new Error('getaddrinfo ENOTFOUND'));

    await expect(
      new GeminiGenerator(config, { generateContent }).generate(REQUEST),
    ).rejects.toThrow(AiProviderUnavailableError);
  });

  it('answers 503 when Google returns a server error', async () => {
    const generateContent = failing(apiError(503, 'model overloaded'));

    await expect(
      new GeminiGenerator(config, { generateContent }).generate(REQUEST),
    ).rejects.toThrow(AiProviderUnavailableError);
  });

  /**
   * The contract with `RetryingGenerator`. It retries on this flag alone, so if these stop
   * being marked the retry silently becomes dead code — which is exactly the bug that let a
   * single Gemini 503 fail a live generation.
   */
  describe('marks which failures are worth another attempt', () => {
    const retryableOf = async (error: Error): Promise<boolean | undefined> => {
      const generateContent = failing(error);
      try {
        await new GeminiGenerator(config, { generateContent }).generate(
          REQUEST,
        );
        return undefined;
      } catch (thrown) {
        return thrown instanceof AiProviderUnavailableError
          ? thrown.retryable
          : undefined;
      }
    };

    it('treats a server error as transient', async () => {
      await expect(
        retryableOf(apiError(503, 'model overloaded')),
      ).resolves.toBe(true);
    });

    it('treats an unreachable host as transient', async () => {
      await expect(
        retryableOf(new Error('getaddrinfo ENOTFOUND')),
      ).resolves.toBe(true);
    });

    it('does not treat a rate limit as transient — it clears on Google’s schedule', async () => {
      await expect(retryableOf(apiError(429, QUOTA_PER_MINUTE))).resolves.toBe(
        false,
      );
    });

    it('does not treat an exhausted daily quota as transient', async () => {
      await expect(retryableOf(apiError(429, QUOTA_PER_DAY))).resolves.toBe(
        false,
      );
    });
  });

  it('answers 503 when the model id has been retired', async () => {
    const generateContent = failing(
      apiError(404, 'This model is no longer available to new users.'),
    );

    await expect(
      new GeminiGenerator(config, { generateContent }).generate(REQUEST),
    ).rejects.toThrow(/no longer available/i);
  });

  it('answers 503 when Gemini refuses the request, so the form is not a blank 500', async () => {
    const generateContent = failing(
      apiError(400, 'Request contains an invalid argument.'),
    );

    await expect(
      new GeminiGenerator(config, { generateContent }).generate(REQUEST),
    ).rejects.toThrow(/rejected the request/i);
  });

  it('answers 503 when the key is refused', async () => {
    const generateContent = failing(apiError(403, 'PERMISSION_DENIED'));

    await expect(
      new GeminiGenerator(config, { generateContent }).generate(REQUEST),
    ).rejects.toThrow(/key was refused/i);
  });
});
