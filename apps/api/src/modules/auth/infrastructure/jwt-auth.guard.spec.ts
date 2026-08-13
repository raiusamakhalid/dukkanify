import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { JwtService } from '@nestjs/jwt';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { UnauthorizedError } from '../../../common/errors/domain.error';
import { AppConfig } from '../../../config/configuration';
import { validateEnv } from '../../../config/env.validation';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';

/**
 * The guard and the strategy tested together, because separately neither answers the
 * question that matters: what a request without a usable token gets back. Everything here
 * is in-process — no server, no database, no network.
 */

const config = new AppConfig(
  validateEnv({
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/dukkanify',
    JWT_SECRET: 'test-secret-that-is-long-enough-32chars',
    JWT_EXPIRES_IN: '7d',
    GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
  }),
);

const jwt = new JwtService({ secret: config.jwt.secret });
const guard = new JwtAuthGuard(new Reflector());
const authenticated: AuthenticatedUser = {
  id: 'user-1',
  email: 'abdullah@example.ae',
};

/**
 * Two routes carrying the metadata the guard reads. `this: void` says out loud what is
 * already true — the handlers are passed around as reflection targets and never called.
 */
class RoutesUnderTest {
  @Public()
  open(this: void): void {}

  closed(this: void): void {}
}

/** Only what passport reads, plus the property it writes the authenticated user onto. */
interface FakeRequest {
  headers: Record<string, string>;
  user?: AuthenticatedUser;
}

function contextFor(
  handler: () => void,
  request: FakeRequest,
): ExecutionContext {
  return new ExecutionContextHost([request, {}], RoutesUnderTest, handler);
}

function bearing(token?: string): FakeRequest {
  return {
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  };
}

const routes = new RoutesUnderTest();

beforeAll(() => {
  // Constructing the strategy is what registers it under the name `AuthGuard('jwt')` asks
  // passport for. Nest does this when the provider is instantiated; here it is explicit.
  new JwtStrategy(config);
});

describe('JwtAuthGuard', () => {
  it('lets a @Public() route through without a token', () => {
    // Synchronously true: passport is never reached, so a public route costs nothing.
    expect(guard.canActivate(contextFor(routes.open, bearing()))).toBe(true);
  });

  it('rejects a private route with no bearer token', async () => {
    await expect(
      guard.canActivate(contextFor(routes.closed, bearing())),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('admits a valid token and puts the caller on the request', async () => {
    const request = bearing(
      jwt.sign({ sub: authenticated.id, email: authenticated.email }),
    );

    await expect(
      guard.canActivate(contextFor(routes.closed, request)),
    ).resolves.toBe(true);
    expect(request.user).toEqual(authenticated);
  });

  it('tells a caller with an expired token to sign in again', async () => {
    const expired = jwt.sign(
      { sub: authenticated.id, email: authenticated.email },
      { expiresIn: -60 },
    );

    await expect(
      guard.canActivate(contextFor(routes.closed, bearing(expired))),
    ).rejects.toThrow(/expired/i);
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = new JwtService({ secret: 'a'.repeat(32) }).sign({
      sub: authenticated.id,
      email: authenticated.email,
    });

    await expect(
      guard.canActivate(contextFor(routes.closed, bearing(forged))),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('rejects a correctly signed token that is not shaped like one of ours', async () => {
    const wrongClaims = jwt.sign({ userId: authenticated.id });

    await expect(
      guard.canActivate(contextFor(routes.closed, bearing(wrongClaims))),
    ).rejects.toThrow(UnauthorizedError);
  });
});
