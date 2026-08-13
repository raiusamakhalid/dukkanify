import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { UnauthorizedError } from '../../../common/errors/domain.error';

/**
 * Authentication for every route, waived only by `@Public()`.
 *
 * Registered globally in `AppModule`, so a new controller is private the moment it exists.
 * The opposite arrangement — opt in per route — makes a forgotten decorator into a data
 * leak instead of a 401.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic === true) {
      return true;
    }
    return super.canActivate(context);
  }

  /**
   * Passport reports failure by argument rather than by throwing, and its own exception is
   * an `HttpException`. Converting here keeps `UnauthorizedError` the single thing the
   * filter maps to 401 (§10), so a client sees one error code for one condition.
   */
  override handleRequest<TUser = AuthenticatedUser>(
    error: unknown,
    user: TUser | false | null | undefined,
    info: unknown,
  ): TUser {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    if (error !== null && error !== undefined) {
      throw new UnauthorizedError('Your session could not be verified.');
    }
    if (user === false || user === null || user === undefined) {
      throw new UnauthorizedError(describeTokenFailure(info));
    }
    return user;
  }
}

/**
 * Turns passport's failure detail into something a person can act on. The distinction that
 * matters to a user is "sign in again" versus "you are not signed in"; anything finer would
 * describe our own token handling to an unauthenticated caller.
 */
function describeTokenFailure(info: unknown): string {
  if (info instanceof Error && info.name === 'TokenExpiredError') {
    return 'Your session has expired. Please sign in again.';
  }
  return 'A valid bearer token is required.';
}
