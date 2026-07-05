import { TransformInterceptor, ApiResponse } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

function buildContext(statusCode = 200): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

function buildHandler(data: unknown): CallHandler {
  return {
    handle: () => of(data),
  };
}

function expectApiResponse(
  result: ApiResponse<unknown> | void,
): asserts result is ApiResponse<unknown> {
  expect(result).toBeDefined();
  if (!result || typeof result !== 'object' || !('data' in result)) {
    throw new Error('Expected wrapped API response');
  }
}

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap response data in { data, statusCode, timestamp } envelope', (done) => {
    const ctx = buildContext(200);
    const handler = buildHandler({ id: '1', name: 'test' });

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expectApiResponse(result);
      expect(result.data).toEqual({ id: '1', name: 'test' });
      expect(result.statusCode).toBe(200);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      done();
    });
  });

  it('should preserve the HTTP status code from the response', (done) => {
    const ctx = buildContext(202);
    const handler = buildHandler({ jobId: 'abc' });

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expectApiResponse(result);
      expect(result.statusCode).toBe(202);
      done();
    });
  });

  it('should include a valid ISO timestamp in the envelope', (done) => {
    const before = new Date();
    const ctx = buildContext(200);
    const handler = buildHandler({});

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expectApiResponse(result);
      const ts = new Date(result.timestamp);
      expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime());
      done();
    });
  });

  it('should wrap null data correctly', (done) => {
    const ctx = buildContext(200);
    const handler = buildHandler(null);

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expectApiResponse(result);
      expect(result.data).toBeNull();
      done();
    });
  });

  it('should wrap array data correctly', (done) => {
    const ctx = buildContext(200);
    const handler = buildHandler([{ id: '1' }, { id: '2' }]);

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expectApiResponse(result);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
      done();
    });
  });

  it('should skip wrapping for 204 No Content responses', (done) => {
    const ctx = buildContext(204);
    const handler = buildHandler(undefined);

    interceptor.intercept(ctx, handler).subscribe((result) => {
      expect(result).toBeUndefined();
      done();
    });
  });
});
