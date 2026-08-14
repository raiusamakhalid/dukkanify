import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthResponse,
  SignInRequest,
  SignUpRequest,
  UserDto,
} from '@dukkanify/contracts';
import {
  ConflictError,
  UnauthorizedError,
} from '../../../common/errors/domain.error';
import {
  GOOGLE_TOKEN_VERIFIER,
  PASSWORD_HASHER,
  USER_ACCOUNT_REPOSITORY,
  type AccessTokenClaims,
  type GoogleTokenVerifierPort,
  type PasswordHasherPort,
  type UserAccountRepositoryPort,
} from './auth.ports';

/**
 * One sentence for every way a password sign-in can fail: no such address, wrong password,
 * or an account whose password Google removed. Telling them apart would answer "does this
 * person have an account here" to anyone who asks (§8). The page that shows this carries the
 * standing note about Google, so the one user this strands is not left guessing.
 */
const SIGN_IN_REFUSED = 'Email or password is incorrect.';

/**
 * Turns a Google identity into an application session.
 *
 * The Google token is verified server-side against our client id (architecture.md §8): a
 * check performed in the browser proves nothing, because everything the browser asserts is
 * attacker-controlled. What leaves here is our own token, signed with our own secret, so
 * every later request is authenticated without another round trip to Google.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(GOOGLE_TOKEN_VERIFIER)
    private readonly googleTokens: GoogleTokenVerifierPort,
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly users: UserAccountRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwords: PasswordHasherPort,
    private readonly jwt: JwtService,
  ) {}

  async signInWithGoogle(idToken: string): Promise<AuthResponse> {
    const identity = await this.googleTokens.verify(idToken);

    // An unverified address is one someone typed, not one Google confirmed. Accepting it
    // would let a new Google account claim an existing user by email alone.
    if (!identity.emailVerified) {
      throw new UnauthorizedError(
        'This Google account has no verified email address.',
      );
    }

    const user = await this.users.upsertByGoogleIdentity(identity);

    // The identifier, never the token and never the address in full.
    this.logger.log(`Signed in user ${user.id} with Google`);

    return this.session(user);
  }

  /**
   * A new account from an address and a password.
   *
   * The address is lowercased first, and that is not cosmetic: `@unique` in Postgres is
   * case-sensitive, so signing up as `A@x.com` while `a@x.com` exists would create a second
   * account for one person — and slip past the conflict check that is the whole defence
   * against writing a password onto somebody else's row.
   */
  async signUpWithPassword(input: SignUpRequest): Promise<AuthResponse> {
    const email = normaliseEmail(input.email);

    // Checked here so the answer is a 409 with a sentence rather than a unique-constraint
    // violation. The repository refuses the same case again, because two sign-ups for one
    // address can arrive at once and the index is the only thing that can settle that.
    if ((await this.users.findCredentialByEmail(email)) !== null) {
      throw new ConflictError(
        'That email is already registered. Sign in instead.',
      );
    }

    const passwordHash = await this.passwords.hash(input.password);

    const user = await this.users.createWithPassword({
      email,
      name: input.name,
      passwordHash,
    });

    this.logger.log(`Registered user ${user.id}`);

    return this.session(user);
  }

  /**
   * Exchanges an address and a password for the same token the Google path issues.
   *
   * Both misses spend a key derivation: without the dummy one, an unknown address is refused
   * in a millisecond and a known address in a hundred, which hands out account existence
   * however carefully the message is worded.
   */
  async signInWithPassword(input: SignInRequest): Promise<AuthResponse> {
    const email = normaliseEmail(input.email);
    const credential = await this.users.findCredentialByEmail(email);

    if (credential === null || credential.passwordHash === null) {
      await this.passwords.spendVerificationTime(input.password);
      this.logger.warn('Password sign-in refused: no password account');
      throw new UnauthorizedError(SIGN_IN_REFUSED);
    }

    const matches = await this.passwords.verify(
      input.password,
      credential.passwordHash,
    );
    if (!matches) {
      this.logger.warn(
        `Password sign-in refused for user ${credential.user.id}`,
      );
      throw new UnauthorizedError(SIGN_IN_REFUSED);
    }

    this.logger.log(`Signed in user ${credential.user.id} with a password`);

    return this.session(credential.user);
  }

  /** The one place a token is minted, so both doors issue exactly the same credential. */
  private async session(user: UserDto): Promise<AuthResponse> {
    const claims: AccessTokenClaims = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(claims);

    return { accessToken, user };
  }
}

/**
 * Lowercased and trimmed, because an address is not case-sensitive to the person typing it
 * and every store this account owns hangs off the row it resolves to.
 */
function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
