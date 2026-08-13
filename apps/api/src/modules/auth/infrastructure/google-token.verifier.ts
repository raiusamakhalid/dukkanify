import { Injectable, Logger } from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { UnauthorizedError } from '../../../common/errors/domain.error';
import { AppConfig } from '../../../config/configuration';
import type {
  GoogleIdentity,
  GoogleTokenVerifierPort,
} from '../application/auth.ports';

/**
 * Verifies a Google `id_token` against Google's signing keys and our client id.
 *
 * `audience` is the part that matters: a signature check alone accepts a valid token minted
 * for a different application, which is a working impersonation. The library caches
 * Google's certificates, so this is a network call only when they rotate.
 */
@Injectable()
export class GoogleTokenVerifier implements GoogleTokenVerifierPort {
  private readonly logger = new Logger(GoogleTokenVerifier.name);
  private readonly client: OAuth2Client;
  private readonly audience: string;

  constructor(config: AppConfig) {
    this.audience = config.google.clientId;
    this.client = new OAuth2Client(this.audience);
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    const payload = await this.verifiedPayload(idToken);

    if (payload === undefined || payload.email === undefined) {
      throw new UnauthorizedError(
        'The Google sign-in token did not identify an account.',
      );
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
    };
  }

  private async verifiedPayload(
    idToken: string,
  ): Promise<TokenPayload | undefined> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audience,
      });
      return ticket.getPayload();
    } catch (error) {
      // Expired, forged, or issued to another client — all useful in the log, and none of
      // it useful to the caller, who would only learn which guess was closest.
      this.logger.warn(
        `Rejected a Google id_token: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedError(
        'The Google sign-in token could not be verified.',
      );
    }
  }
}
