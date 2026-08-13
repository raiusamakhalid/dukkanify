/**
 * Errors the application layer is allowed to throw.
 *
 * None of these know about HTTP. `AllExceptionsFilter` performs the single translation to
 * a status code (§10), which is what allows the same use cases to be driven later by a
 * queue worker or a CLI without rewriting their failure handling.
 */
export abstract class DomainError extends Error {
  /** Stable, machine-readable, safe to show a client and safe to switch on. */
  abstract readonly code: string;

  /**
   * Extra context for the client — a field path, the offending value, the Zod issues that
   * made a blueprint invalid. Never a stack trace, never an internal identifier.
   */
  readonly details: unknown;

  protected constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

/** Input broke a domain invariant. Distinct from a schema failure at the HTTP boundary. */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_FAILED';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Authentication is required.') {
    super(message);
  }
}

/** Authenticated, but not the owner. Deliberately different from NotFound. */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';

  constructor(message = 'You do not have access to this resource.') {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(resource: string, identifier?: string) {
    super(
      identifier === undefined
        ? `${resource} was not found.`
        : `${resource} "${identifier}" was not found.`,
    );
  }
}

/**
 * The model's output failed the contract twice, including after a repair turn. A contract
 * violation is not a server fault, which is why this is a 422 and never a 500.
 */
export class BlueprintGenerationFailedError extends DomainError {
  readonly code = 'BLUEPRINT_GENERATION_FAILED';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

/** The upstream provider timed out or was unreachable. Retryable, and the client should know. */
export class AiProviderUnavailableError extends DomainError {
  readonly code = 'AI_PROVIDER_UNAVAILABLE';

  constructor(
    message = 'The store generator is temporarily unavailable. Please try again.',
  ) {
    super(message);
  }
}
