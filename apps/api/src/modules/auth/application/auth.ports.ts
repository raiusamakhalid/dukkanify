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

/** A user, plus the one column that never leaves the server. */
export interface UserCredential {
  readonly user: UserDto;
  /** Null for an account that has only ever signed in with Google. */
  readonly passwordHash: string | null;
}

export interface UserAccountRepositoryPort {
  /**
   * Resolves a verified identity to exactly one user row — matched by `googleId` first,
   * then by email, so an account that already exists under a different sign-in path is
   * adopted rather than duplicated.
   *
   * Adopting a row **clears any password hash on it**. Google has verified the address; the
   * password on that row was set by whoever typed the address first, and this application
   * sends no verification email to tell the two apart. Without this, signing up as someone
   * else's address before they arrive would leave a working credential on the account they
   * then use (§8).
   *
   * Returns `UserDto` rather than a persistence model: it is the shape both apps already
   * agree on, so nothing downstream has to map it again.
   */
  upsertByGoogleIdentity(identity: GoogleIdentity): Promise<UserDto>;

  /** The account for an address, with its hash, or null when nobody has registered it. */
  findCredentialByEmail(email: string): Promise<UserCredential | null>;

  /**
   * Creates an account that signs in by password.
   *
   * Rejects rather than updates when the address exists: writing a credential onto a row the
   * caller has not proven they own is account takeover, and an unauthenticated request can
   * never prove it.
   */
  createWithPassword(account: NewPasswordAccount): Promise<UserDto>;
}

export interface NewPasswordAccount {
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
}

export const USER_ACCOUNT_REPOSITORY = Symbol('UserAccountRepositoryPort');

/**
 * Turning a password into something storable, and back into a yes or no.
 *
 * A port for the same reason the Google verifier is one: the algorithm and its cost are the
 * volatile part. Raising scrypt's parameters, or moving to argon2 the day a dependency is
 * welcome, must not reach `AuthService` — and a test of sign-in should not spend 80ms of
 * key derivation per case to find out that a wrong password is refused.
 */
export interface PasswordHasherPort {
  /** Returns the salt, the parameters and the derived key in one self-describing string. */
  hash(password: string): Promise<string>;

  /**
   * Whether `password` produced `encoded`. Answers `false` for a hash it cannot parse
   * rather than throwing: a malformed row is a data fault, and a sign-in is not the place
   * to turn one into a 500.
   */
  verify(password: string, encoded: string): Promise<boolean>;

  /**
   * Spends the work a real verification would have spent, and answers nothing.
   *
   * Called when no account matched, so that "no such email" and "wrong password" take the
   * same time to refuse. Without it the endpoint answers in a millisecond for an address
   * nobody has registered and in ~100ms for one that exists, which is an enumeration oracle
   * that no amount of careful wording in the response can close.
   */
  spendVerificationTime(password: string): Promise<void>;
}

export const PASSWORD_HASHER = Symbol('PasswordHasherPort');

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
