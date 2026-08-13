import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { UnauthorizedError } from '../../../common/errors/domain.error';
import { AppConfig } from '../../../config/configuration';
import { AccessTokenClaimsSchema } from '../application/auth.ports';

/**
 * Verifies the application access token and puts the caller on the request.
 *
 * Stateless on purpose: no database read per request. The claims carry everything a route
 * needs, and every query that touches user data is scoped by owner id anyway, so a token
 * outliving its user reaches nothing — see the ownership rule in architecture.md §8.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: AppConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwt.secret,
      // Pinned so a token cannot arrive asking to be checked a weaker way than it was signed.
      algorithms: ['HS256'],
    });
  }

  validate(payload: unknown): AuthenticatedUser {
    const claims = AccessTokenClaimsSchema.safeParse(payload);
    if (!claims.success) {
      // Correctly signed but not shaped like one of ours: an old token from before a claim
      // changed, or a secret shared with something it should not have been.
      throw new UnauthorizedError(
        'The access token is not valid for this API.',
      );
    }
    return { id: claims.data.sub, email: claims.data.email };
  }
}
