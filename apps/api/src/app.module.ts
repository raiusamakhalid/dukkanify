import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppConfig, AppConfigModule } from './config/configuration';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './infrastructure/prisma/prisma.module';

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
  ],
  controllers: [HealthController],
  providers: [
    // Registered as providers rather than in main.ts so that Nest injects their
    // dependencies: AllExceptionsFilter needs AppConfig to decide about stack traces.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
