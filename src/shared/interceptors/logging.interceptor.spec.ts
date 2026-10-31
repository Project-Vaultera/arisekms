import { ExecutionContext } from '@nestjs/common';
import { throwError } from 'rxjs';

import { AppLogger } from '../logger/logger.service';
import * as utils from '../request-context/util';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let loggingInterceptor: LoggingInterceptor;

  const mockRequest = {
    headers: {},
    url: 'mock-url',
    header: jest.fn(),
  };

  const mockExecutionContext = ({
    switchToHttp: jest.fn().mockReturnThis(),
    getRequest: jest.fn().mockReturnThis(),
  } as unknown) as ExecutionContext;

  const mockCallHandler = {
    handle: jest.fn(),
    pipe: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const mockModuleRef = { get: jest.fn() } as never;
    loggingInterceptor = new LoggingInterceptor(new AppLogger(), mockModuleRef);
  });

  it('should be defined', () => {
    expect(loggingInterceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('intercept', async () => {
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock<
        any,
        any
      >).mockReturnValueOnce(mockRequest);
      mockCallHandler.handle.mockReturnValueOnce({
        pipe: jest.fn(),
      });

      const createRequestContext = jest.spyOn(utils, 'createRequestContext');

      loggingInterceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockExecutionContext.switchToHttp().getRequest).toHaveBeenCalled();
      expect(createRequestContext).toHaveBeenCalledWith(mockRequest);
    });

    it('records failed mutations without swallowing the error', (done) => {
      const failure = { status: 401 };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock<any, any>).mockReturnValueOnce({
        ...mockRequest,
        method: 'POST',
        url: '/api/v1/auth/login',
        body: { username: 'intruder' },
        params: {},
        user: undefined,
      });
      mockCallHandler.handle.mockReturnValueOnce(throwError(() => failure));

      loggingInterceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => done(new Error('should not succeed')),
        error: (e) => {
          try {
            expect(e).toBe(failure);
            done();
          } catch (assertErr) {
            done(assertErr);
          }
        },
      });
    });
  });
});
