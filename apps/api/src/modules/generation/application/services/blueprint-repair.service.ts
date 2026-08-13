import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type Locale,
  type StoreBlueprint,
  StoreBlueprintSchema,
} from '@dukkanify/contracts';
import type { ZodIssue } from 'zod';
import { BlueprintGenerationFailedError } from '../../../../common/errors/domain.error';
import {
  AI_GENERATOR,
  type AiGeneratorPort,
  type BlueprintIssue,
  type GeneratedBlueprint,
} from '../../domain/ports/ai-generator.port';

/**
 * One first attempt and, at most, one repair turn. Two model calls, never more (§7).
 *
 * Attempts are capped rather than retried until success because the two failures look
 * identical from here and only one is worth paying for again: a model that produced the
 * wrong shape can fix it when told exactly what was wrong, and a model that cannot satisfy
 * the contract will not start on the third try.
 */
const MAX_ATTEMPTS = 2;

export interface BlueprintRequest {
  readonly prompt: string;
  readonly locale: Locale;
}

export interface ProducedBlueprint {
  readonly blueprint: StoreBlueprint;
  readonly promptVersion: string;
  /** 1 when the first attempt validated, 2 when the repair turn saved it. */
  readonly attempts: number;
}

/**
 * Turns a provider's raw output into a blueprint the rest of the application can trust.
 *
 * A blind retry re-rolls the same failure. Feeding back the exact Zod issues gives the model
 * the information the first attempt was missing, which is the whole difference between a
 * repair turn and a retry — and why this is worth a service rather than a loop.
 */
@Injectable()
export class BlueprintRepairService {
  private readonly logger = new Logger(BlueprintRepairService.name);

  constructor(
    @Inject(AI_GENERATOR) private readonly generator: AiGeneratorPort,
  ) {}

  async produce(request: BlueprintRequest): Promise<ProducedBlueprint> {
    let generated: GeneratedBlueprint = await this.generator.generate({
      prompt: request.prompt,
      locale: request.locale,
    });

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const parsed = StoreBlueprintSchema.safeParse(generated.raw);
      if (parsed.success) {
        return {
          blueprint: parsed.data,
          promptVersion: generated.promptVersion,
          attempts: attempt,
        };
      }

      const issues = toBlueprintIssues(parsed.error.issues);

      if (attempt === MAX_ATTEMPTS) {
        this.logger.warn(
          `Blueprint rejected after ${String(MAX_ATTEMPTS)} attempts: ${summarise(issues)}`,
        );
        // 422, never 500: the model broke a contract, and the client is owed the reason
        // rather than a request id (§10).
        throw new BlueprintGenerationFailedError(
          'The generated storefront did not match the required shape, even after a correction. Try describing the store differently.',
          issues,
        );
      }

      this.logger.log(`Repairing blueprint: ${summarise(issues)}`);
      generated = await this.generator.generate({
        prompt: request.prompt,
        locale: request.locale,
        repair: { previous: generated.raw, issues },
      });
    }

    // Unreachable: the loop either returns or throws on its last iteration. Present because
    // the compiler cannot prove that, and an exception beats an implicit `undefined`.
    throw new BlueprintGenerationFailedError(
      'The store generator produced no usable storefront.',
    );
  }
}

/** Zod's issue list, flattened to the two fields the port promises a provider. */
function toBlueprintIssues(issues: readonly ZodIssue[]): BlueprintIssue[] {
  return issues.map((issue) => ({
    path: issue.path.length === 0 ? '(root)' : issue.path.join('.'),
    message: issue.message,
  }));
}

/** For the log: the first few faults, which is enough to recognise a recurring one. */
function summarise(issues: readonly BlueprintIssue[]): string {
  const shown = issues
    .slice(0, 3)
    .map((issue) => `${issue.path} ${issue.message}`)
    .join('; ');
  return issues.length > 3
    ? `${shown} (+${String(issues.length - 3)} more)`
    : shown;
}
