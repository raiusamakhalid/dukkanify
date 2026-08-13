import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfig } from '../../config/configuration';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import {
  GOOGLE_TOKEN_VERIFIER,
  USER_ACCOUNT_REPOSITORY,
} from './application/auth.ports';
import { AuthService } from './application/auth.service';
import { GoogleTokenVerifier } from './infrastructure/google-token.verifier';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { PrismaUserAccountRepository } from './infrastructure/prisma-user-account.repository';
import { AuthController } from './presentation/auth.controller';

/**
 * Ports bound to adapters here and nowhere else: `AuthService` names an interface, this
 * module decides which implementation satisfies it (architecture.md §4).
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.jwt.secret,
        // Seconds, parsed and range-checked at boot, so `JWT_EXPIRES_IN=banana` fails
        // startup rather than the first sign-in of the day.
        signOptions: { expiresIn: config.jwt.expiresInSeconds },
      }),
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: GOOGLE_TOKEN_VERIFIER, useClass: GoogleTokenVerifier },
    { provide: USER_ACCOUNT_REPOSITORY, useClass: PrismaUserAccountRepository },
  ],
})
export class AuthModule {}
