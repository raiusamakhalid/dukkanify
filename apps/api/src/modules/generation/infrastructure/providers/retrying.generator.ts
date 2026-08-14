import { Logger } from '@nestjs/common';
import { AiProviderUnavailableError } from '../../../../common/errors/domain.error';
import type {
  AiGeneratorPort,
  BlueprintGenerationRequest,
  GeneratedBlueprint,
} from '../../domain/ports/ai-generator.port';

/**
 * Another attempt at a vendor call that failed for a reason a retry can clear.
 *
 * A decorator rather than a loop inside each adapter, for two reasons. It is written once
 * instead of once per vendor — there are two adapters today and the port exists so there can
 * be a third — and it is testable with an object literal, because nothing in here knows what
 * an SDK is. What counts as retryable is not this class's judgement either: each adapter
 * already translates its vendor's failures into domain errors, and marks the transient ones
 * (see `AiProviderUnavailableError.retryable`).
 *
 * Deliberately not wrapped around the mock generator, which has no network to fail.
 *
 * ## Why the delays are this short
 *
 * The request is a person waiting on a page, inside a function with a 150s ceiling
 * (`vercel.json`). A vendor 5xx comes back in milliseconds, so two quick attempts cost almost
 * nothing and cover the overload that prompted this. A minute-long backoff would be worse than
 * the failure it papers over: the browser would give up first, and a timed-out attempt is
 * marked non-retryable precisely so its sixty seconds are never spent twice.
 */

/** Two retries after the first attempt. Milliseconds, growing, plus jitter. */
const DEFAULT_BACKOFF_MS: readonly number[] = [400, 1_200];

export class RetryingGenerator implements AiGeneratorPort {
  private readonly logger = new Logger(RetryingGenerator.name);

  constructor(
    private readonly inner: AiGeneratorPort,
    /** Injectable so a test can use `[0, 0]` and not sleep. */
    private readonly backoffMs: readonly number[] = DEFAULT_BACKOFF_MS,
  ) {}

  async generate(
    request: BlueprintGenerationRequest,
  ): Promise<GeneratedBlueprint> {
    const attempts = this.backoffMs.length + 1;

    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.inner.generate(request);
      } catch (error) {
        const delay = this.backoffMs[attempt - 1];

        // The last attempt, or a failure no retry can help: the caller gets the vendor's own
        // error, unchanged. Wrapping it here would cost the message the adapter chose.
        if (delay === undefined || !isRetryable(error)) {
          throw error;
        }

        this.logger.warn(
          `Generation attempt ${String(attempt)} of ${String(attempts)} failed ` +
            `(${messageOf(error)}); retrying in ~${String(delay)}ms`,
        );
        await sleep(jittered(delay));
      }
    }
  }
}

function isRetryable(error: unknown): boolean {
  return error instanceof AiProviderUnavailableError && error.retryable;
}

/**
 * Up to a quarter more than the delay, so simultaneous requests do not all come back at the
 * same instant — the moment a vendor is overloaded is exactly when every caller is retrying.
 */
function jittered(delayMs: number): number {
  return delayMs + Math.random() * delayMs * 0.25;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
