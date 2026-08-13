import { z } from 'zod';
import type { UserDto } from '@dukkanify/contracts';

/**
 * The boundaries the auth module talks across.
 *
 * `auth/` has no `domain/` folder on purpose (architecture.md §4): it holds no business
 * rules, only token verification. It still needs ports — the service must be able to run
 * without Google and without PostgreSQL, or every test of it becomes an integration test.
 * They live here, in the layer that owns them, and are implemented in `infrastructure/`.
 */

/** The subset of a verified Google `id_token` payload this application uses. */
export interface GoogleIdentity {
  /** The `sub` claim: stable per Google account, unlike the email address. */
  readonly googleId: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name: string | null;
  readonly avatarUrl: string | null;
}

export interface GoogleTokenVerifierPort {
  /**
   * Verifies signature, expiry and audience against the configured client id.
   * Throws `UnauthorizedError` for any token that does not come back trustworthy.
   */
  verify(idToken: string): Promise<GoogleIdentity>;
}

export const GOOGLE_TOKEN_VERIFIER = Symbol('GoogleTokenVerifierPort');

export interface UserAccountRepositoryPort {
  /**
   * Resolves a verified identity to exactly one user row — matched by `googleId` first,
   * then by email, so an account that already exists under a different sign-in path is
   * adopted rather than duplicated.
   *
   * Returns `UserDto` rather than a persistence model: it is the shape both apps already
   * agree on, so nothing downstream has to map it again.
   */
  upsertByGoogleIdentity(identity: GoogleIdentity): Promise<UserDto>;
}

export const USER_ACCOUNT_REPOSITORY = Symbol('UserAccountRepositoryPort');

/**
 * The claims of the application access token — the contract between the service that signs
 * it and the strategy that verifies it. A schema rather than an interface because the
 * strategy parses a decoded token, and "we signed it" is a reason to expect a shape, not a
 * reason to skip checking it.
 */
export const AccessTokenClaimsSchema = z.object({
  /** Standard JWT subject: the application user id, never the Google id. */
  sub: z.string().min(1),
  email: z.string().email(),
});

export type AccessTokenClaims = z.infer<typeof AccessTokenClaimsSchema>;
