import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Rate limits by account when there is one, and by address otherwise.
 *
 * The default tracker keys on IP, which is the wrong unit for an authenticated API: a
 * company behind one NAT would share a budget, and one account could spend twice by using a
 * phone as well as a laptop. It matters most on `POST /generate`, where each call costs real
 * money.
 *
 * This replaces the stock guard globally rather than sitting on one route, because two
 * throttler guards do not compose: `@Throttle()` is metadata on the handler, so *every*
 * throttler guard in the chain applies it — a per-route guard would tighten the global
 * guard's IP limit to the same number as a side effect, and one user's generations would
 * rate-limit their colleague's. One guard, one decision.
 *
 * It must therefore run after authentication, which is why `AppModule` registers it second.
 */
@Injectable()
export class ScopedThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(
    request: Record<string, unknown>,
  ): Promise<string> {
    const user = request['user'];
    if (isAuthenticatedUser(user)) {
      return Promise.resolve(`user:${user.id}`);
    }
    // Public routes and rejected requests: the address is all there is to go on.
    return super.getTracker(request);
  }
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string'
  );
}
