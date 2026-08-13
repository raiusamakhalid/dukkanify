import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Every successful response has the same envelope, so a client never has to guess (§9). */
export interface ApiEnvelope<T> {
  data: T;
  meta: { timestamp: string };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiEnvelope<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        meta: { timestamp: new Date().toISOString() },
      })),
    );
  }
}
