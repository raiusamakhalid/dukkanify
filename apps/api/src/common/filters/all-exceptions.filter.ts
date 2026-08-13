import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AppConfig } from '../../config/configuration';
import {
  AiProviderUnavailableError,
  BlueprintGenerationFailedError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors/domain.error';

/** The §10 table, as data. Ordered most specific first, since matching is by `instanceof`. */
const STATUS_BY_ERROR: ReadonlyArray<
  readonly [new (...args: never[]) => DomainError, HttpStatus]
> = [
  [ValidationError, HttpStatus.BAD_REQUEST],
  [UnauthorizedError, HttpStatus.UNAUTHORIZED],
  [ForbiddenError, HttpStatus.FORBIDDEN],
  [NotFoundError, HttpStatus.NOT_FOUND],
  [BlueprintGenerationFailedError, HttpStatus.UNPROCESSABLE_ENTITY],
  [AiProviderUnavailableError, HttpStatus.SERVICE_UNAVAILABLE],
];

interface ErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
  meta: { path: string; timestamp: string };
}

/**
 * The only place in the application that decides an HTTP status.
 *
 * Application code throws `DomainError` subclasses and never `HttpException`; this filter
 * is the seam that keeps HTTP out of the layers underneath it (§10).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: AppConfig) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const requestId = this.resolveRequestId(request);
    const { status, code, message, details } = this.describe(exception);

    this.log(exception, status, requestId, request);

    const body: ErrorBody = {
      error: {
        code,
        message,
        requestId,
        ...(details === undefined ? {} : { details }),
      },
      meta: { path: request.url, timestamp: new Date().toISOString() },
    };
    response.status(status).json(body);
  }

  /**
   * A caller-supplied `x-request-id` is honoured so a trace survives a proxy hop; otherwise
   * one is minted here, because an error a user can quote is an error we can find in a log.
   */
  private resolveRequestId(request: Request): string {
    const header = request.headers['x-request-id'];
    const supplied = Array.isArray(header) ? header[0] : header;
    return supplied !== undefined && supplied.trim().length > 0
      ? supplied
      : randomUUID();
  }

  private describe(exception: unknown): {
    status: HttpStatus;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof DomainError) {
      const match = STATUS_BY_ERROR.find(([type]) => exception instanceof type);
      return {
        status: match?.[1] ?? HttpStatus.INTERNAL_SERVER_ERROR,
        code: exception.code,
        message: exception.message,
        ...(exception.details === undefined
          ? {}
          : { details: exception.details }),
      };
    }

    // Thrown by Nest itself — guards, pipes, the router. Already carries a status.
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      return {
        status: exception.getStatus(),
        code: 'HTTP_EXCEPTION',
        message: exception.message,
        ...(typeof payload === 'object' ? { details: payload } : {}),
      };
    }

    // Anything else is a bug. The client is told nothing beyond the request id: an
    // unexpected failure's message can carry connection strings and query fragments.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    };
  }

  private log(
    exception: unknown,
    status: HttpStatus,
    requestId: string,
    request: Request,
  ): void {
    const where = `${request.method} ${request.url}`;
    const detail =
      exception instanceof Error ? exception.message : String(exception);

    if (status < HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.warn(`[${requestId}] ${where} -> ${status}: ${detail}`);
      return;
    }

    // Stack traces are for the server log, never the response, and never in production.
    const stack =
      this.config.isProduction || !(exception instanceof Error)
        ? undefined
        : exception.stack;
    this.logger.error(`[${requestId}] ${where} -> ${status}: ${detail}`, stack);
  }
}
