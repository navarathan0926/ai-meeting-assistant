import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

/**
 * Wraps successful controller responses in a consistent envelope.
 * Skips wrapping for 204 No Content responses.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | void>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | void> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
        if (statusCode === 204 || data === undefined) {
          return undefined;
        }

        return {
          data,
          statusCode,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
