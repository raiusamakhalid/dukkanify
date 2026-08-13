// Loads apps/api/.env into process.env before anything reads it. Must stay first.
import 'dotenv/config';

import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';

const SWAGGER_PATH = 'api/docs';

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

  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: [...config.corsOrigins], credentials: true });

  // URI versioning: /api/v1/... — a version in the path is the one form every client,
  // proxy and log can see without inspecting headers.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Lets PrismaService close its pool on SIGTERM instead of dying with the process.
  app.enableShutdownHooks();

  if (!config.isProduction) {
    setupSwagger(app);
  }

  await app.listen(config.port);

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on http://localhost:${config.port}/api/v1`);
  logger.log(`AI provider: ${config.ai.provider} (${config.ai.model})`);
  if (!config.isProduction) {
    logger.log(`Swagger at http://localhost:${config.port}/${SWAGGER_PATH}`);
  }
}

/** Off in production: the API surface is public documentation for a private product. */
function setupSwagger(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Dukkanify API')
      .setDescription(
        'AI store builder — generation, stores and storefront delivery',
      )
      .setVersion('1')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup(SWAGGER_PATH, app, document);
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
