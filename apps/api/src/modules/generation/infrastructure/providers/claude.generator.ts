import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  STORE_BLUEPRINT_TOOL_NAME,
  STORE_BLUEPRINT_TOOL_SCHEMA,
} from '@dukkanify/contracts';
import {
  AiProviderUnavailableError,
  BlueprintGenerationFailedError,
} from '../../../../common/errors/domain.error';
import type { AppConfig } from '../../../../config/configuration';
import type {
  AiGeneratorPort,
  BlueprintGenerationRequest,
  GeneratedBlueprint,
} from '../../domain/ports/ai-generator.port';
import { PROMPT_VERSION } from '../prompts/prompt.version';
import { SYSTEM_PROMPT } from '../prompts/system.prompt';
import { buildRepairPrompt, buildUserPrompt } from '../prompts/user.prompt';

/** A storefront is a few thousand tokens; a minute is generous and bounds a wedged socket. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * The same JSON Schema the contract exports, retyped for the SDK.
 *
 * The two disagree on one field: the contract makes `required` optional, the SDK makes it
 * nullable, and under `exactOptionalPropertyTypes` those are different things. Rebuilding
 * the object states the equivalence in one place — a cast would state it invisibly, and
 * CLAUDE.md bans the double cast it would take.
 */
const TOOL_INPUT_SCHEMA: Anthropic.Tool.InputSchema = (() => {
  const { required, ...rest } = STORE_BLUEPRINT_TOOL_SCHEMA;
  return required === undefined ? { ...rest } : { ...rest, required };
})();

/**
 * The one SDK call this adapter makes, stated as the narrowest signature that admits it.
 *
 * `Pick<Anthropic['messages'], 'create'>` would drag in three overloads and an `APIPromise`,
 * which a test can only satisfy with a cast. Declaring the single non-streaming call means
 * a fake is an object literal with one method, and the real client still satisfies it.
 */
export interface MessageCreator {
  create(
    params: Anthropic.MessageCreateParamsNonStreaming,
    options: { signal: AbortSignal },
  ): Promise<Anthropic.Message>;
}

/**
 * Anthropic's Messages API, behind the port.
 *
 * Tool use rather than "reply with JSON": the tool's `input_schema` is generated from the
 * same Zod definition that validates the answer (§7), so the model is constrained by the
 * contract rather than asked to remember it. The tool call is forced, so there is no branch
 * where the model chats instead of producing a store.
 */
export class ClaudeGenerator implements AiGeneratorPort {
  private readonly logger = new Logger(ClaudeGenerator.name);
  private readonly messages: MessageCreator;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AppConfig, messages?: MessageCreator) {
    this.model = config.ai.model;
    this.maxTokens = config.ai.maxTokens;
    this.messages =
      messages ??
      new Anthropic({
        // Present because env validation refuses to boot with AI_PROVIDER=claude and no key.
        apiKey: config.ai.apiKey ?? '',
      }).messages;
  }

  async generate(
    request: BlueprintGenerationRequest,
  ): Promise<GeneratedBlueprint> {
    const startedAt = Date.now();
    const response = await this.send(request);
    const latencyMs = Date.now() - startedAt;

    // The prompt body is never logged — it is a customer's words, and it is long. What is
    // logged is what makes a bad generation diagnosable a week later (§7).
    this.logger.log(
      `blueprint generated in ${String(latencyMs)}ms — model=${this.model} ` +
        `promptVersion=${PROMPT_VERSION} in=${String(response.usage.input_tokens)} ` +
        `out=${String(response.usage.output_tokens)} stop=${String(response.stop_reason)}`,
    );

    return {
      raw: this.extractBlueprint(response),
      promptVersion: PROMPT_VERSION,
    };
  }

  private async send(
    request: BlueprintGenerationRequest,
  ): Promise<Anthropic.Message> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      return await this.messages.create(
        {
          model: this.model,
          max_tokens: this.maxTokens,
          system: SYSTEM_PROMPT,
          // Adaptive thinking is on by default on current models and shares the `max_tokens`
          // budget with the answer. This task is structured extraction against a fixed
          // schema, not open reasoning, so the budget goes entirely to the blueprint — which
          // also makes `AI_MAX_TOKENS` mean one predictable thing.
          thinking: { type: 'disabled' },
          tools: [
            {
              name: STORE_BLUEPRINT_TOOL_NAME,
              description:
                'Emit the complete storefront blueprint. Call this exactly once.',
              input_schema: TOOL_INPUT_SCHEMA,
            },
          ],
          // Forced: the only acceptable answer to this request is a blueprint.
          tool_choice: { type: 'tool', name: STORE_BLUEPRINT_TOOL_NAME },
          messages: [{ role: 'user', content: userMessageFor(request) }],
        },
        { signal: controller.signal },
      );
    } catch (error) {
      throw this.asDomainError(error, controller.signal.aborted);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * The forced tool call means a well-formed response always carries exactly one `tool_use`
   * block. Anything else is the model failing to answer the question, which is a 422 — a
   * contract failure, not a server fault (§10).
   */
  private extractBlueprint(response: Anthropic.Message): unknown {
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (toolUse === undefined) {
      throw new BlueprintGenerationFailedError(
        'The store generator did not return a storefront. Try rewording your description.',
        { stopReason: response.stop_reason },
      );
    }

    if (response.stop_reason === 'max_tokens') {
      // The tool input is truncated mid-object, so it will fail validation with a confusing
      // shape error. Saying why here beats sending half a store into a repair turn.
      throw new BlueprintGenerationFailedError(
        'The generated storefront was cut short. Try a shorter description.',
        { stopReason: response.stop_reason },
      );
    }

    return toolUse.input;
  }

  /**
   * Everything the vendor can do to us, sorted into the two answers a client can act on:
   * "come back later" (503) and "your request cannot be satisfied" (everything else, which
   * is left to bubble as a 500 because it means this application is misconfigured).
   */
  private asDomainError(error: unknown, aborted: boolean): unknown {
    if (aborted) {
      this.logger.warn(
        `Anthropic request aborted after ${String(REQUEST_TIMEOUT_MS)}ms`,
      );
      return new AiProviderUnavailableError(
        'The store generator took too long to respond. Please try again.',
      );
    }

    if (error instanceof Anthropic.APIConnectionError) {
      this.logger.warn(`Anthropic unreachable: ${error.message}`);
      return new AiProviderUnavailableError();
    }

    if (
      error instanceof Anthropic.RateLimitError ||
      error instanceof Anthropic.InternalServerError
    ) {
      this.logger.warn(`Anthropic returned ${String(error.status)}`);
      return new AiProviderUnavailableError();
    }

    // A 400 or a 401 is our bug or our configuration, and a 500 with a request id is the
    // honest answer to it. Never logged: the API key, which the SDK keeps out of messages.
    if (error instanceof Anthropic.APIError) {
      this.logger.error(`Anthropic rejected the request: ${error.message}`);
    }
    return error;
  }
}

function userMessageFor(request: BlueprintGenerationRequest): string {
  return request.repair === undefined
    ? buildUserPrompt(request.prompt, request.locale)
    : buildRepairPrompt(request.prompt, request.locale, request.repair);
}
