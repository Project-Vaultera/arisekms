import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AuditService } from '../../audit/services/audit.service';
import { AppLogger } from '../logger/logger.service';
import { createRequestContext } from '../request-context/util';

// Mutations only: GETs would flood the trail.
const AUDITED_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private appLogger: AppLogger,
    private moduleRef: ModuleRef,
  ) {
    this.appLogger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const ctx = createRequestContext(request);

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        const responseTime = Date.now() - now;

        const resData = { method, statusCode, responseTime };

        this.appLogger.log(ctx, 'Request completed', { resData });

        // Lazy lookup avoids a SharedModule <-> AuditModule cycle.
        // Audit must never break the request.
        if (AUDITED_METHODS.includes(method)) {
          this.writeAudit(request, method, statusCode);
        }
      }),
    );
  }

  private writeAudit(
    request: { url?: string; params?: any; body?: any; user?: any },
    method: string,
    statusCode: number,
  ): void {
    try {
      const audit = this.moduleRef.get(AuditService, { strict: false });
      const url: string = request.url ?? '';
      const idCandidate =
        request.params?.id ?? request.body?.username ?? request.body?.name ?? null;
      audit.record({
        actorId: request.user?.id ?? null,
        action: method,
        entityType: url.split('?')[0].split('/').filter(Boolean).join('/'),
        entityId:
          idCandidate !== null && idCandidate !== undefined
            ? String(idCandidate).slice(0, 64)
            : null,
        metadata: {
          owner: request.user?.username ?? request.body?.username ?? null,
          data: `${method} ${url} -> ${statusCode}`,
        },
        statusCode,
        outcome: statusCode < 400 ? 'success' : 'error',
      });
    } catch {
      // audit must never break the request
    }
  }
}
