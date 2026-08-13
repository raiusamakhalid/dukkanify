import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import type { UserDto } from '@dukkanify/contracts';
import { UnauthorizedError } from '../../../common/errors/domain.error';
import {
  AccessTokenClaimsSchema,
  type GoogleIdentity,
  type GoogleTokenVerifierPort,
  type UserAccountRepositoryPort,
} from './auth.ports';
import { AuthService } from './auth.service';

/**
 * No network and no database: both are ports, so the fakes are the interfaces themselves.
 * The JWT service is real — signing is the behaviour under test, not a collaborator.
 */

const TEST_SECRET = 'a'.repeat(32);

const VERIFIED_IDENTITY: GoogleIdentity = {
  googleId: 'google-sub-1',
  email: 'abdullah@example.ae',
  emailVerified: true,
  name: 'Abdullah Al Mansoori',
  avatarUrl: 'https://example.com/a.png',
};

function verifierReturning(identity: GoogleIdentity): GoogleTokenVerifierPort {
  return { verify: (): Promise<GoogleIdentity> => Promise.resolve(identity) };
}

function verifierRejecting(error: Error): GoogleTokenVerifierPort {
  return { verify: (): Promise<GoogleIdentity> => Promise.reject(error) };
}

/** Counts writes as well as answering them, which is how "one row per user" is asserted. */
class InMemoryUserAccounts implements UserAccountRepositoryPort {
  readonly rows = new Map<string, UserDto>();

  upsertByGoogleIdentity(identity: GoogleIdentity): Promise<UserDto> {
    const existing = this.rows.get(identity.googleId);
    const user: UserDto = {
      id: existing?.id ?? `user-${this.rows.size + 1}`,
      email: existing?.email ?? identity.email,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
    };
    this.rows.set(identity.googleId, user);
    return Promise.resolve(user);
  }
}

function createService(verifier: GoogleTokenVerifierPort): {
  service: AuthService;
  users: InMemoryUserAccounts;
  jwt: JwtService;
} {
  const users = new InMemoryUserAccounts();
  const jwt = new JwtService({
    secret: TEST_SECRET,
    signOptions: { expiresIn: 604_800 },
  });
  return { service: new AuthService(verifier, users, jwt), users, jwt };
}

describe('AuthService', () => {
  it('returns an access token carrying the application user id', async () => {
    const { service, jwt } = createService(
      verifierReturning(VERIFIED_IDENTITY),
    );

    const response = await service.signInWithGoogle('id-token');

    const claims = AccessTokenClaimsSchema.parse(
      jwt.verify(response.accessToken, { secret: TEST_SECRET }),
    );
    expect(claims).toEqual({
      sub: response.user.id,
      email: VERIFIED_IDENTITY.email,
    });
  });

  it('returns the user without any field the DTO does not declare', async () => {
    const { service } = createService(verifierReturning(VERIFIED_IDENTITY));

    const response = await service.signInWithGoogle('id-token');

    expect(Object.keys(response.user).sort()).toEqual([
      'avatarUrl',
      'email',
      'id',
      'name',
    ]);
  });

  it('creates exactly one account across repeated sign-ins', async () => {
    const { service, users } = createService(
      verifierReturning(VERIFIED_IDENTITY),
    );

    const first = await service.signInWithGoogle('id-token');
    const second = await service.signInWithGoogle('id-token');

    expect(second.user.id).toBe(first.user.id);
    expect(users.rows.size).toBe(1);
  });

  it('refuses an identity whose email Google has not verified', async () => {
    const { service, users } = createService(
      verifierReturning({ ...VERIFIED_IDENTITY, emailVerified: false }),
    );

    await expect(service.signInWithGoogle('id-token')).rejects.toThrow(
      UnauthorizedError,
    );
    expect(users.rows.size).toBe(0);
  });

  it('propagates a rejected token as the unauthorized error the filter maps to 401', async () => {
    const { service } = createService(
      verifierRejecting(
        new UnauthorizedError(
          'The Google sign-in token could not be verified.',
        ),
      ),
    );

    await expect(service.signInWithGoogle('forged')).rejects.toThrow(
      UnauthorizedError,
    );
  });
});
