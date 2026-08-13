import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * One line per request: method, path, status, duration. Enough to see a slow endpoint or a
 * spike of 4xx without a tracing stack, and small enough to leave on in production.
 *
 * Failures are logged by AllExceptionsFilter, which knows the status it chose — logging them
 * here as well would double every error in the log.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const { method, url } = http.getRequest<Request>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = http.getResponse<Response>();
        this.logger.log(
          `${method} ${url} ${statusCode} ${Date.now() - startedAt}ms`,
        );
      }),
    );
  }
}
