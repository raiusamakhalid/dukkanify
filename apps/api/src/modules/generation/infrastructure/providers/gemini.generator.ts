import { Logger } from '@nestjs/common';
import {
  FinishReason,
  type GenerateContentConfig,
  type GenerateContentResponse,
  GoogleGenAI,
} from '@google/genai';
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

/** Matches the Claude adapter: a storefront is quick, a minute bounds a wedged socket. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * The one SDK call this adapter makes. Narrow on purpose, so a test is an object literal.
 */
export interface ContentGenerator {
  generateContent(params: {
    model: string;
    contents: string;
    config: GenerateContentConfig;
  }): Promise<GenerateContentResponse>;
}

/**
 * Google's Gemini API, behind the same port as Claude.
 *
 * ## Why this adapter sends no response schema
 *
 * Gemini's structured output takes a `responseJsonSchema`, and it looked like the natural
 * home for `STORE_BLUEPRINT_TOOL_SCHEMA` — the same generated schema the Claude adapter
 * hands to tool use. It is not. The API rejects our blueprint schema outright with
 * `400 INVALID_ARGUMENT`, and bisecting it against the live API located the cause: every
 * part passes on its own, and the `pages` array of page objects containing an `anyOf` of
 * five section shapes does not, so the limit is structural — nesting and breadth, not one
 * bad keyword. Sending a schema the API refuses would make every request a 400.
 *
 * Even where it is accepted, the SDK documents `responseJsonSchema` as honouring only a
 * subset of JSON Schema. These constraints appear in our contract and are **not** enforced
 * by Google, whatever schema is sent:
 *
 * | Constraint            | Where it appears in the blueprint                     |
 * | --------------------- | ----------------------------------------------------- |
 * | `pattern`             | slugs, SKUs, hex colours, CSS lengths, internal hrefs, phone numbers |
 * | `minLength`/`maxLength` | every text field's length cap                        |
 * | `const`               | the `type` discriminator on each section variant      |
 * | `exclusiveMinimum`    | a product price being greater than zero               |
 * | `default`             | `ctaHref` and the product-grid `limit`                |
 *
 * Cross-field rules — every `product.categorySlug` naming a category this blueprint
 * defines, exactly one page of each type, a HERO on the home page — were never expressible
 * in JSON Schema at all, which is why `packages/contracts` splits the structural schema
 * from the refined one.
 *
 * So the contract is carried the only way that works for every provider: stated in the
 * system prompt, enforced by `StoreBlueprintSchema`, and repaired by the one repair turn in
 * `BlueprintRepairService`. `responseMimeType: 'application/json'` still guarantees the
 * body parses, which is the part a prompt cannot promise. This is the mechanism
 * architecture.md §7 describes doing real work rather than acting as a safety net: against
 * Gemini the repair turn is the *primary* enforcement of formats, not a fallback.
 */
export class GeminiGenerator implements AiGeneratorPort {
  private readonly logger = new Logger(GeminiGenerator.name);
  private readonly models: ContentGenerator;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AppConfig, models?: ContentGenerator) {
    this.model = config.ai.model;
    this.maxTokens = config.ai.maxTokens;
    this.models =
      models ??
      // Present because env validation refuses to boot with AI_PROVIDER=gemini and no key.
      new GoogleGenAI({ apiKey: config.ai.apiKey ?? '' }).models;
  }

  async generate(
    request: BlueprintGenerationRequest,
  ): Promise<GeneratedBlueprint> {
    const startedAt = Date.now();
    const response = await this.send(request);
    const latencyMs = Date.now() - startedAt;

    const usage = response.usageMetadata;
    // The prompt body is never logged — a customer's words, and long. This is what makes a
    // bad generation diagnosable a week later (§7).
    this.logger.log(
      `blueprint generated in ${String(latencyMs)}ms — model=${this.model} ` +
        `promptVersion=${PROMPT_VERSION} in=${String(usage?.promptTokenCount ?? 0)} ` +
        `out=${String(usage?.candidatesTokenCount ?? 0)} ` +
        `thoughts=${String(usage?.thoughtsTokenCount ?? 0)} ` +
        `finish=${String(response.candidates?.[0]?.finishReason ?? 'unknown')}`,
    );

    return {
      raw: this.extractBlueprint(response),
      promptVersion: PROMPT_VERSION,
    };
  }

  private async send(
    request: BlueprintGenerationRequest,
  ): Promise<GenerateContentResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      return await this.models.generateContent({
        model: this.model,
        contents: userMessageFor(request),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          // Guarantees a parseable body. The shape inside it is this application's problem.
          responseMimeType: 'application/json',
          maxOutputTokens: this.maxTokens,
          // Thinking is on by default and its tokens come out of `maxOutputTokens`: an
          // eight-thousand-token budget was observed being spent entirely on thoughts,
          // returning MAX_TOKENS with an empty body. This is structured extraction against
          // a schema, so the whole budget goes to the answer.
          thinkingConfig: { thinkingBudget: 0 },
          abortSignal: controller.signal,
        },
      });
    } catch (error) {
      throw this.asDomainError(error, controller.signal.aborted);
    } finally {
      clearTimeout(timer);
    }
  }

  private extractBlueprint(response: GenerateContentResponse): unknown {
    const finishReason = response.candidates?.[0]?.finishReason;

    if (finishReason === FinishReason.MAX_TOKENS) {
      // The JSON is truncated mid-object, so it would fail validation with a confusing
      // shape error. Saying why beats spending a repair turn on half a store.
      throw new BlueprintGenerationFailedError(
        'The generated storefront was cut short. Try a shorter description.',
        { finishReason },
      );
    }

    const text = response.text;
    if (text === undefined || text.trim().length === 0) {
      // Usually a safety filter: the model returned a candidate with no content.
      throw new BlueprintGenerationFailedError(
        'The store generator returned nothing. Try rewording your description.',
        { finishReason },
      );
    }

    try {
      return JSON.parse(text);
    } catch {
      // Deliberately not an error: the unparsed text is returned so the validator rejects
      // it and the repair turn quotes the model's own output back at it. JSON mode makes
      // this rare, and the repair turn is what fixes it when it happens.
      this.logger.warn('Model returned a body that is not JSON; repairing.');
      return text;
    }
  }

  private asDomainError(error: unknown, aborted: boolean): unknown {
    if (aborted) {
      this.logger.warn(
        `Gemini request aborted after ${String(REQUEST_TIMEOUT_MS)}ms`,
      );
      return new AiProviderUnavailableError(
        'The store generator took too long to respond. Please try again.',
      );
    }

    const status = statusOf(error);

    if (status === 429) {
      return this.quotaError(error);
    }

    if (status !== undefined && status >= 500) {
      // Overload, almost always, and gone by the next attempt: marked transient so
      // RetryingGenerator tries again rather than failing a page on one vendor hiccup.
      this.logger.warn(`Gemini returned ${String(status)}`);
      return AiProviderUnavailableError.transient();
    }

    if (status === undefined) {
      // No HTTP status at all: DNS, TLS, a dropped socket. Also worth a second attempt.
      this.logger.warn(
        `Gemini unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
      return AiProviderUnavailableError.transient();
    }

    // 400 or 403 is our schema, our model name or our key — this application's bug, and a
    // 500 with a request id is the honest answer. Never logged: the key itself.
    if (error instanceof Error) {
      this.logger.error(`Gemini rejected the request: ${error.message}`);
    }
    return error;
  }

  /**
   * Both flavours of 429 are a 503 — the generator is unavailable either way, and §10 has
   * no status that means "come back tomorrow". They are still worth telling apart: one
   * clears itself in seconds and the other needs a person to raise a quota or wait for the
   * daily reset, so they differ in what the caller is told and in how loudly they are
   * logged.
   */
  private quotaError(error: unknown): AiProviderUnavailableError {
    const detail = error instanceof Error ? error.message : String(error);

    if (/per\s*day|perday/i.test(detail)) {
      this.logger.error(
        'Gemini daily quota exhausted — generation is unavailable until the quota resets.',
      );
      return new AiProviderUnavailableError(
        'The store generator has reached its daily limit. Please try again tomorrow.',
      );
    }

    const retryAfter = /"retryDelay"\s*:\s*"(\d+)s"/.exec(detail)?.[1];
    this.logger.warn(
      `Gemini rate limit reached${retryAfter === undefined ? '' : `; retry in ${retryAfter}s`}`,
    );
    return new AiProviderUnavailableError(
      retryAfter === undefined
        ? 'The store generator is busy. Please try again in a moment.'
        : `The store generator is busy. Please try again in about ${retryAfter} seconds.`,
    );
  }
}

/** The SDK's `ApiError` carries `status`; a transport failure carries nothing. */
function statusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status } = error;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function userMessageFor(request: BlueprintGenerationRequest): string {
  return request.repair === undefined
    ? buildUserPrompt(request.prompt, request.locale)
    : buildRepairPrompt(request.prompt, request.locale, request.repair);
}
