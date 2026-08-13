import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppConfig, AppConfigModule } from './config/configuration';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/infrastructure/jwt-auth.guard';

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
  ],
  controllers: [HealthController],
  providers: [
    // Registered as providers rather than in main.ts so that Nest injects their
    // dependencies: AllExceptionsFilter needs AppConfig to decide about stack traces.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Order is registration order. Rate limiting runs first so a flood of unauthenticated
    // requests is cut before any of them reaches token verification.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Authentication is global and waived per route with `@Public()`, so a controller added
    // tomorrow is private until someone decides otherwise.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
