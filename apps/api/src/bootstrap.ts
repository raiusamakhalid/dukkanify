import {
  ValidationPipe,
  VersioningType,
  type INestApplication,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import type { AppConfig } from './config/configuration';

/**
 * Everything that turns a bare Nest application into *this* API.
 *
 * It lives here rather than in `main.ts` because there are two entry points into the same
 * application: a long-lived server locally (`main.ts`) and a serverless function on Vercel
 * (`serverless.ts`). A second copy of this list would be a second thing to forget — the day
 * CORS is widened for a new origin, the entry point that actually serves production traffic
 * has to be the one that changed.
 *
 * What is *not* here is deliberate: `listen`, `enableShutdownHooks` and the startup log
 * belong to the process that owns a port, and a function invocation owns neither.
 */

export const SWAGGER_PATH = 'api/docs';

export function configureApp(app: INestApplication, config: AppConfig): void {
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

  if (!config.isProduction) {
    setupSwagger(app);
  }
}

/** Off in production: the API surface is public documentation for a private product. */
function setupSwagger(app: INestApplication): void {
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
