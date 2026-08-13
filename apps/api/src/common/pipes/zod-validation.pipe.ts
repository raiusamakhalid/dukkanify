import { Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType, ZodTypeDef } from 'zod';
import { ValidationError } from '../errors/domain.error';

/**
 * Validates a request body against a schema from `@dukkanify/contracts`.
 *
 * The global `ValidationPipe` reads class-validator metadata, which cannot express a
 * discriminated union or a cross-field rule like "every product's category must exist" —
 * both of which the store payloads are made of. CLAUDE.md allows either validator at the
 * boundary; Zod is the one that already defines these shapes, and re-declaring them as
 * decorated classes would be a second definition of the contract.
 *
 * Failures become `ValidationError`, so the filter answers 400 with the offending paths and
 * the controller never learns that validation happened.
 */
@Injectable()
export class ZodValidationPipe<TValue> implements PipeTransform<
  unknown,
  TValue
> {
  constructor(private readonly schema: ZodType<TValue, ZodTypeDef, unknown>) {}

  transform(value: unknown): TValue {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    throw new ValidationError(
      'The request body does not match the expected shape.',
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
}
