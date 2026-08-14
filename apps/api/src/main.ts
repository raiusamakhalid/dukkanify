// Loads apps/api/.env into process.env before anything reads it. Must stay first.
import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SWAGGER_PATH, configureApp } from './bootstrap';
import { AppConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';

/** The long-lived server. Vercel enters through `serverless.ts` instead; both share
    `configureApp`, so the application they serve is the same one. */
async function bootstrap(): Promise<void> {
  // Checked before Nest starts so a missing variable is reported as the list it is. Once
  // the container is running, Nest's exception handler wraps every startup failure in an
  // injector stack trace, which buries the one line the reader needs. The same function
  // runs again inside AppConfigModule — it is pure, and that keeps the DI container the
  // single source of the parsed values rather than a global assembled here.
  validateEnv(process.env);

  const app = await NestFactory.create(AppModule, { abortOnError: false });

  // Reading configuration through the container, not process.env: if validation failed,
  // NestFactory.create has already thrown with the full list of problems.
  const config = app.get(AppConfig);

  configureApp(app, config);

  // Lets PrismaService close its pool on SIGTERM instead of dying with the process.
  app.enableShutdownHooks();

  await app.listen(config.port);

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on http://localhost:${config.port}/api/v1`);
  logger.log(`AI provider: ${config.ai.provider} (${config.ai.model})`);
  if (!config.isProduction) {
    logger.log(`Swagger at http://localhost:${config.port}/${SWAGGER_PATH}`);
  }
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(error instanceof Error ? error.message : String(error));
  // The stack matters when the cause is a bug, and is noise when the cause is a missing
  // variable. Production logs the message only; development gets both.
  if (
    error instanceof Error &&
    error.stack !== undefined &&
    process.env['NODE_ENV'] !== 'production'
  ) {
    logger.debug(error.stack);
  }
  process.exit(1);
});
