import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ScopedThrottlerGuard } from './common/guards/scoped-throttler.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppConfig, AppConfigModule } from './config/configuration';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/infrastructure/jwt-auth.guard';
import { GenerationModule } from './modules/generation/generation.module';
import { StoresModule } from './modules/stores/stores.module';

@Module({
  imports: [
    // .env is loaded by main.ts, before validation runs. There is no @nestjs/config module
    // here on purpose: a second loader would mean two places that decide what an
    // environment variable is worth, and AppConfig is already the typed answer.
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [
          { ttl: config.throttle.ttl, limit: config.throttle.limit },
        ],
      }),
    }),
    PrismaModule,
    AuthModule,
    StoresModule,
    GenerationModule,
  ],
  controllers: [HealthController],
  providers: [
    // Registered as providers rather than in main.ts so that Nest injects their
    // dependencies: AllExceptionsFilter needs AppConfig to decide about stack traces.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Order is registration order, and authentication comes first on purpose: the throttler
    // keys on the account when there is one, and it can only see a caller that a guard has
    // already established. Verifying a JWT is an HMAC and no database round trip, so the
    // unauthenticated flood this ordering exposes it to is cheap to refuse.
    //
    // Authentication is global and waived per route with `@Public()`, so a controller added
    // tomorrow is private until someone decides otherwise.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ScopedThrottlerGuard },
  ],
})
export class AppModule {}
