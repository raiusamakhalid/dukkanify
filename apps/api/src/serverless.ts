import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Express, Request, Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { AppConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';

/**
 * The API as a single serverless function, which is how Vercel runs it.
 *
 * Vercel has no long-lived processes: it hands an already-accepted request to a handler and
 * freezes the container afterwards. So this builds the application but never calls
 * `listen()` — the Express instance underneath Nest is invoked directly as a request
 * listener, and Vercel owns the socket.
 *
 * Two things make that cheap enough to do per request. Prisma 7 reaches PostgreSQL through
 * a driver adapter with no query engine binary to unpack, and the application is cached
 * across invocations of the same warm instance, so the Nest container is built once per cold
 * start rather than once per request.
 */

const logger = new Logger('Serverless');

let application: Promise<Express> | undefined;

async function createApplication(): Promise<Express> {
  // Same reason as main.ts: a configuration mistake should read as a list of variables in
  // the function log, not as a Nest injector stack trace.
  validateEnv(process.env);

  const adapter = new ExpressAdapter();
  const app = await NestFactory.create(AppModule, adapter, {
    abortOnError: false,
  });

  configureApp(app, app.get(AppConfig));

  // `init` and not `listen`: routes, guards and interceptors are all registered, and the
  // HTTP server that `listen` would create is Vercel's to run.
  await app.init();
  logger.log('Nest application ready');

  return adapter.getInstance<Express>();
}

function warmApplication(): Promise<Express> {
  application ??= createApplication().catch((error: unknown) => {
    // A cold start can fail for a reason that is over by the next request — a database
    // refusing its first connection, most likely. Dropping the cached promise means the
    // next invocation retries, instead of this instance answering 500 until it is recycled.
    application = undefined;
    throw error;
  });
  return application;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const app = await warmApplication();
  // Express decorates the very objects it is handed — `Request` and `Response` are those
  // objects with its own prototype applied — so this narrows a type, it does not reinterpret
  // a value. Vercel's runtime passes the Node originals.
  app(request as Request, response as Response);
}
