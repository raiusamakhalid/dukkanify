import type { ZodType, ZodTypeDef } from 'zod';
import { ValidationError } from '../../../common/errors/domain.error';

/**
 * The two ways this domain refuses bad state.
 *
 * `common/errors` is the only thing `domain/` imports from outside itself, and it is a file
 * of plain classes with no framework in it — the dependency rule in architecture.md §3 bars
 * Nest, Prisma and the AI SDK from this layer, which is what makes it testable with nothing
 * running. Everything an entity throws is a `ValidationError`, so the filter maps it to 400
 * without the domain ever knowing HTTP exists.
 */

/** A domain rule that must hold. The message is written for the person who broke it. */
export function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new ValidationError(message);
  }
}

/**
 * Validates a value against a schema from `@dukkanify/contracts`.
 *
 * The domain owns relationships — which product belongs to which category, how many pages a
 * store has. It does not own what a slug or a hex colour looks like: those are defined once
 * in the contracts package that the API, the model's tool schema and the web app all share.
 * Re-stating those formats here would be a second definition free to drift from the first.
 */
export function parseOrThrow<TValue>(
  // Typed by what it produces rather than as `ZodTypeAny`, whose inferred output is `any` —
  // which would quietly turn every entity field it validates into an unchecked value.
  schema: ZodType<TValue, ZodTypeDef, unknown>,
  value: unknown,
  field: string,
): TValue {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  throw new ValidationError(
    `${field} is not valid.`,
    result.error.issues.map((issue) => ({
      path: [field, ...issue.path].join('.'),
      message: issue.message,
    })),
  );
}
