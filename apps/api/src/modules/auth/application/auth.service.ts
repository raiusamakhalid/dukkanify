import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponse } from '@dukkanify/contracts';
import { UnauthorizedError } from '../../../common/errors/domain.error';
import {
  GOOGLE_TOKEN_VERIFIER,
  USER_ACCOUNT_REPOSITORY,
  type AccessTokenClaims,
  type GoogleTokenVerifierPort,
  type UserAccountRepositoryPort,
} from './auth.ports';

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
    const claims: AccessTokenClaims = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(claims);

    // The identifier, never the token and never the address in full.
    this.logger.log(`Signed in user ${user.id}`);

    return { accessToken, user };
  }
}
