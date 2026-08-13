import type { Locale } from '@dukkanify/contracts';

/**
 * A single Zod issue, flattened to the two fields a repair turn needs.
 *
 * Deliberately not `ZodIssue`: the port describes what a model must be told, not how this
 * application happens to validate. "categories.1.slug — must be lower-case" is actionable to
 * anything that can read; a Zod discriminant is not.
 */
export interface BlueprintIssue {
  readonly path: string;
  readonly message: string;
}

/** What a second attempt is given: its own last answer, and exactly what was wrong with it. */
export interface BlueprintRepairContext {
  readonly previous: unknown;
  readonly issues: readonly BlueprintIssue[];
}

export interface BlueprintGenerationRequest {
  readonly prompt: string;
  readonly locale: Locale;
  /** Absent on the first attempt; present on the repair turn (architecture.md §7). */
  readonly repair?: BlueprintRepairContext;
}

export interface GeneratedBlueprint {
  /**
   * Unvalidated. A provider's job is to produce output, not to decide whether it is a
   * blueprint — that judgement belongs to `StoreBlueprintSchema`, in one place, for every
   * provider. Typing this as `unknown` is what makes the repair turn possible at all.
   */
  readonly raw: unknown;
  /**
   * Which revision of the prompt produced it. Reported by the adapter rather than read from
   * configuration, because the prompt and its version live in the same file — and a mock
   * store should never be attributable to a prompt that never ran (§7).
   */
  readonly promptVersion: string;
}

/**
 * The model vendor, as the domain sees it: a prompt in, an unvalidated blueprint out.
 *
 * One of the two volatile dependencies in this product (architecture.md §7). Owned here and
 * implemented in `infrastructure/providers/`, so swapping Claude for another vendor is one
 * new file and one factory line, with no use case touched.
 */
export interface AiGeneratorPort {
  generate(request: BlueprintGenerationRequest): Promise<GeneratedBlueprint>;
}

export const AI_GENERATOR = Symbol('AiGeneratorPort');
