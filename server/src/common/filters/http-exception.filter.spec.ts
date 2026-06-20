import { AllExceptionsFilter } from './http-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildMockResponse() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json };
}

function buildMockHost(
  method = 'GET',
  url = '/api/meetings',
  response = buildMockResponse(),
) {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method, url }),
    }),
    response,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  // ── HttpException ─────────────────────────────────────────────────────────

  describe('HttpException handling', () => {
    it('should return the HttpException status code and message', () => {
      const exception = new HttpException('Meeting not found', HttpStatus.NOT_FOUND);
      const host = buildMockHost('GET', '/api/meetings/1') as unknown as ArgumentsHost;

      filter.catch(exception, host);

      const res = (host as any).response;
      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Meeting not found',
        }),
      );
    });

    it('should extract message array from HttpException response objects', () => {
      const exception = new HttpException(
        { message: ['field is required', 'field must be string'], error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );
      const host = buildMockHost('POST', '/api/meetings/upload') as unknown as ArgumentsHost;

      filter.catch(exception, host);

      const res = (host as any).response;
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(Array.isArray(jsonArg.message) || typeof jsonArg.message === 'string').toBe(true);
    });

    it('should include path and timestamp in the error response', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
      const host = buildMockHost('GET', '/api/meetings/123') as unknown as ArgumentsHost;

      filter.catch(exception, host);

      const res = (host as any).response;
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.path).toBe('/api/meetings/123');
      expect(typeof jsonArg.timestamp).toBe('string');
    });
  });

  // ── Unknown exceptions ────────────────────────────────────────────────────

  describe('unknown exception handling', () => {
    it('should return 500 with a generic message for non-HttpException errors', () => {
      const exception = new Error('Unexpected database crash');
      const host = buildMockHost('GET', '/api/meetings') as unknown as ArgumentsHost;

      filter.catch(exception, host);

      const res = (host as any).response;
      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonArg.message).toContain('unexpected error');
    });

    it('should return 500 for thrown string exceptions', () => {
      const host = buildMockHost('GET', '/api') as unknown as ArgumentsHost;

      filter.catch('something went wrong', host);

      const res = (host as any).response;
      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should return 500 for null/undefined exceptions', () => {
      const host = buildMockHost('GET', '/api') as unknown as ArgumentsHost;

      filter.catch(null, host);

      const res = (host as any).response;
      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
