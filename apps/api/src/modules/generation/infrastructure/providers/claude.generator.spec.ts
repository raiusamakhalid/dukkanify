import Anthropic from '@anthropic-ai/sdk';
import { STORE_BLUEPRINT_TOOL_NAME } from '@dukkanify/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AiProviderUnavailableError,
  BlueprintGenerationFailedError,
} from '../../../../common/errors/domain.error';
import { AppConfig } from '../../../../config/configuration';
import { validateEnv } from '../../../../config/env.validation';
import { PROMPT_VERSION } from '../prompts/prompt.version';
import { ClaudeGenerator, type MessageCreator } from './claude.generator';

/**
 * The adapter with the SDK replaced by a function.
 *
 * Nothing here reaches the network or needs a key: `MessageCreator` narrows the dependency
 * to the one call this class makes, which is what makes the failure paths — a timeout, an
 * unreachable API, a model that answers without calling the tool — testable at all.
 */

const config = new AppConfig(
  validateEnv({
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/dukkanify',
    JWT_SECRET: 'test-secret-that-is-long-enough-32chars',
    GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
    AI_PROVIDER: 'claude',
    ANTHROPIC_API_KEY: 'sk-ant-test',
  }),
);

const BLUEPRINT = { store: { name: 'Dar Al Oud' } };

type CreateMock = MessageCreator['create'];

function respondingWith(
  content: Anthropic.ContentBlock[],
  stopReason: Anthropic.Message['stop_reason'] = 'tool_use',
): CreateMock {
  const message: Anthropic.Message = {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: config.ai.model,
    content,
    container: null,
    stop_reason: stopReason,
    stop_sequence: null,
    stop_details: null,
    usage: {
      input_tokens: 1200,
      output_tokens: 3400,
      cache_creation: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      inference_geo: null,
      output_tokens_details: null,
      server_tool_use: null,
      service_tier: null,
    },
  };
  return vi.fn(() => Promise.resolve(message));
}

function toolUseBlock(input: unknown): Anthropic.ContentBlock {
  return {
    type: 'tool_use',
    id: 'toolu_test',
    name: STORE_BLUEPRINT_TOOL_NAME,
    caller: { type: 'direct' },
    input,
  };
}

function textBlock(text: string): Anthropic.ContentBlock {
  return { type: 'text', text, citations: null };
}

function rejectingWith(error: Error): CreateMock {
  return vi.fn(() => Promise.reject(error));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ClaudeGenerator', () => {
  it('returns the tool input untouched, for the contract to judge', async () => {
    const create = respondingWith([toolUseBlock(BLUEPRINT)]);

    const generated = await new ClaudeGenerator(config, { create }).generate({
      prompt: 'Create a luxury perfume store',
      locale: 'en',
    });

    expect(generated.raw).toBe(BLUEPRINT);
    expect(generated.promptVersion).toBe(PROMPT_VERSION);
  });

  it('forces the blueprint tool on the configured model', async () => {
    const create = respondingWith([toolUseBlock(BLUEPRINT)]);

    await new ClaudeGenerator(config, { create }).generate({
      prompt: 'Create a luxury perfume store',
      locale: 'en',
    });

    const [params, options] = vi.mocked(create).mock.calls[0] ?? [];
    expect(params?.model).toBe('claude-sonnet-5');
    expect(params?.tool_choice).toEqual({
      type: 'tool',
      name: STORE_BLUEPRINT_TOOL_NAME,
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends the previous answer and its faults on a repair turn', async () => {
    const create = respondingWith([toolUseBlock(BLUEPRINT)]);

    await new ClaudeGenerator(config, { create }).generate({
      prompt: 'Create a luxury perfume store',
      locale: 'en',
      repair: {
        previous: { store: { name: '' } },
        issues: [{ path: 'store.name', message: 'must not be empty' }],
      },
    });

    const [params] = vi.mocked(create).mock.calls[0] ?? [];
    const sent = JSON.stringify(params);
    expect(sent).toContain('store.name: must not be empty');
    expect(sent).toContain('previous attempt was rejected');
  });

  it('answers 422 when the model replies without calling the tool', async () => {
    const create = respondingWith(
      [textBlock('I would rather not.')],
      'end_turn',
    );

    await expect(
      new ClaudeGenerator(config, { create }).generate({
        prompt: 'Create a luxury perfume store',
        locale: 'en',
      }),
    ).rejects.toThrow(BlueprintGenerationFailedError);
  });

  it('answers 422 when the answer was cut off mid-store', async () => {
    const create = respondingWith([toolUseBlock({ store: {} })], 'max_tokens');

    await expect(
      new ClaudeGenerator(config, { create }).generate({
        prompt: 'Create a luxury perfume store',
        locale: 'en',
      }),
    ).rejects.toThrow(/cut short/i);
  });

  it('answers 503 when the API cannot be reached', async () => {
    const create = rejectingWith(
      new Anthropic.APIConnectionError({ message: 'socket hang up' }),
    );

    await expect(
      new ClaudeGenerator(config, { create }).generate({
        prompt: 'Create a luxury perfume store',
        locale: 'en',
      }),
    ).rejects.toThrow(AiProviderUnavailableError);
  });

  it('answers 503 when the model takes longer than the timeout', async () => {
    vi.useFakeTimers();
    // Resolves only when the adapter's own AbortController fires, which is the behaviour
    // under test: the request is abandoned rather than left hanging on a wedged socket.
    const hangUntilAborted: MessageCreator = {
      create: (_params, options) =>
        new Promise<Anthropic.Message>((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new Error('Request was aborted.'));
          });
        }),
    };

    const pending = new ClaudeGenerator(config, hangUntilAborted).generate({
      prompt: 'Create a luxury perfume store',
      locale: 'en',
    });
    const assertion = expect(pending).rejects.toThrow(
      AiProviderUnavailableError,
    );
    await vi.advanceTimersByTimeAsync(60_000);

    await assertion;
  });

  it('lets a misconfiguration surface as a server error rather than a 503', async () => {
    // A 401 means our key is wrong. Telling the caller "try again shortly" would be a lie.
    const unauthorized = new Anthropic.AuthenticationError(
      401,
      undefined,
      'invalid x-api-key',
      new Headers(),
    );
    const create = rejectingWith(unauthorized);

    await expect(
      new ClaudeGenerator(config, { create }).generate({
        prompt: 'Create a luxury perfume store',
        locale: 'en',
      }),
    ).rejects.toBe(unauthorized);
  });
});
