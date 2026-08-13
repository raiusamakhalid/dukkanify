import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { UnauthorizedError } from '../errors/domain.error';

/** What the JWT strategy attaches to the request once a token has been verified. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Reads the authenticated user, and throws if there is none.
 *
 * Throwing rather than returning `undefined` means a controller can take a
 * `AuthenticatedUser` — not an optional one — so no use case downstream has to re-check
 * something the guard already guaranteed.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    if (request.user === undefined) {
      throw new UnauthorizedError('No authenticated user on the request.');
    }
    return request.user;
  },
);
