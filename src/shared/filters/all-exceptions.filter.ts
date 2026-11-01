import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Request, Response } from 'express';

import { AuditService, normalizeAuditEntityType } from '../../audit/services/audit.service';
import { REQUEST_ID_TOKEN_HEADER } from '../constants';
import { BaseApiException } from '../exceptions/base-api.exception';
// Mutations only: GETs would flood the trail. Mirrors the interceptor,
// which never sees guard-level rejections — failures land here instead.
import { AUDITED_METHODS } from '../interceptors/logging.interceptor';
import { AppLogger } from '../logger/logger.service';
import { createRequestContext } from '../request-context/util';

@Catch()
export class AllExceptionsFilter<T> implements ExceptionFilter {
  /** set logger context */
  constructor(
    private config: ConfigService,
    private readonly logger: AppLogger,
    private moduleRef: ModuleRef,
  ) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: T, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    const req: Request = ctx.getRequest<Request>();
    const res: Response = ctx.getResponse<Response>();

    const path = req.url;
    const timestamp = new Date().toISOString();
    const requestId = req.headers[REQUEST_ID_TOKEN_HEADER];
    const requestContext = createRequestContext(req);

    let stack: any;
    let statusCode: HttpStatus | undefined = undefined;
    let errorName: string | undefined = undefined;
    let message: string | undefined = undefined;
    let details: string | Record<string, any> | undefined = undefined;
    // TODO : Based on language value in header, return a localized message.
    const acceptedLanguage = 'ja';
    let localizedMessage: string | undefined = undefined;

    // TODO : Refactor the below cases into a switch case and tidy up error response creation.
    if (exception instanceof BaseApiException) {
      statusCode = exception.getStatus();
      errorName = exception.constructor.name;
      message = exception.message;
      localizedMessage = exception.localizedMessage
        ? exception.localizedMessage[acceptedLanguage]
        : undefined;
      details = exception.details || exception.getResponse();
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorName = exception.constructor.name;
      message = exception.message;
      details = exception.getResponse();
    } else if (exception instanceof Error) {
      errorName = exception.constructor.name;
      message = exception.message;
      stack = exception.stack;
    }

    // Set to internal server error in case it did not match above categories.
    statusCode = statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    errorName = errorName || 'InternalException';
    message = message || 'Internal server error';

    // NOTE: For reference, please check https://cloud.google.com/apis/design/errors
    const error = {
      statusCode,
      message,
      localizedMessage,
      errorName,
      details,
      // Additional meta added by us.
      path,
      requestId,
      timestamp,
    };
    this.logger.warn(requestContext, error.message, {
      error,
      stack,
    });

    // Failed mutations (bad login, 4xx/5xx) are audited here: the logging
    // interceptor never runs for guard-level rejections. Never breaks responses.
    if (AUDITED_METHODS.includes(req.method)) {
      try {
        const audit = this.moduleRef.get(AuditService, { strict: false });
        const url = req.url ?? '';
        const body = (req.body ?? {}) as Record<string, unknown>;
        const idCandidate = req.params?.id ?? body.username ?? body.name ?? null;
        audit.record({
          actorId: (req as any).user?.id ?? null,
          action: req.method,
          entityType: normalizeAuditEntityType(url),
          entityId:
            idCandidate !== null && idCandidate !== undefined
              ? String(idCandidate).slice(0, 64)
              : null,
          metadata: {
            owner: (req as any).user?.username ?? (body.username as string) ?? null,
            data: `${req.method} ${url} -> ${statusCode}`,
          },
          statusCode,
          outcome: 'error',
        });
      } catch {
        // audit must never break error responses
      }
    }

    // Suppress original internal server error details in prod mode
    const isProMood = this.config.get<string>('env') !== 'development';
    if (isProMood && statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      error.message = 'Internal server error';
    }

    res.status(statusCode).json({ error });
  }
}
