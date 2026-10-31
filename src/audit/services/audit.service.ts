import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToClass } from 'class-transformer';
import { Between, ILike, Repository } from 'typeorm';

import { normalizeRoles,ROLE } from '../../auth/constants/role.constant';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { AuditLogOutput } from '../dtos/audit-log-output.dto';
import { AuditLog } from '../entities/audit-log.entity';

export interface AuditQuery {
  action?: string;
  entityType?: string;
  actorId?: number;
  outcome?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private repository: Repository<AuditLog>,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AuditService.name);
  }

  // Fire-and-forget form used by the logging interceptor and services.
  // A failed insert is logged, never thrown: audit must not break requests.
  record(entry: Partial<AuditLog>): void;
  // Explicit form used by admin flows (role changes, approvals).
  record(
    ctx: RequestContext,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
    extra?: { statusCode?: number; outcome?: string },
  ): Promise<AuditLog>;
  record(
    arg1: RequestContext | Partial<AuditLog>,
    action?: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
    extra?: { statusCode?: number; outcome?: string },
  ): void | Promise<AuditLog> {
    if (typeof action === 'string') {
      const ctx = arg1 as RequestContext;
      const statusCode = extra?.statusCode ?? null;
      const row = this.repository.create({
        actorId: ctx.user?.id ?? null,
        action,
        entityType: entityType ?? '',
        entityId: entityId ?? null,
        metadata: metadata ?? null,
        statusCode,
        outcome:
          extra?.outcome ?? (statusCode === null ? null : statusCode < 400 ? 'success' : 'error'),
      });
      return this.repository.save(row);
    }

    const entry = arg1 as Partial<AuditLog>;
    const statusCode = entry.statusCode ?? null;
    this.repository
      .save(
        this.repository.create({
          actorId: entry.actorId ?? null,
          action: entry.action ?? 'HTTP',
          entityType: entry.entityType ?? '',
          entityId: entry.entityId ?? null,
          metadata: entry.metadata ?? null,
          statusCode,
          outcome:
            entry.outcome ?? (statusCode === null ? null : statusCode < 400 ? 'success' : 'error'),
        }),
      )
      .catch((e) =>
        this.logger.error({} as RequestContext, 'audit write failed', {
          action: entry.action ?? 'HTTP',
          entityType: entry.entityType ?? '',
          error: e instanceof Error ? e.message : String(e),
        }),
      );
  }

  async list(
    ctx: RequestContext,
    query: AuditQuery = {},
  ): Promise<{ items: AuditLogOutput[]; total: number }> {
    this.logger.log(ctx, `${this.list.name} was called`);
    this.assertAuditReader(ctx);

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 500);

    const [items, total] = await this.repository.findAndCount({
      where: this.buildWhere(query),
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: plainToClass(AuditLogOutput, items, { excludeExtraneousValues: true }),
      total,
    };
  }

  private assertAuditReader(ctx: RequestContext): void {
    const roles = normalizeRoles(ctx.user?.roles ?? []);
    if (!roles.includes(ROLE.ARISE_IT_ADMIN)) {
      throw new ForbiddenException('Audit records require IT admin access');
    }
  }

  private buildWhere(query: AuditQuery): Record<string, unknown> | Record<string, unknown>[] {
    if (query.search) {
      const term = ILike(`%${query.search}%`);
      return [{ action: term }, { entityType: term }];
    }

    const where: Record<string, unknown> = {};
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.actorId !== undefined) where.actorId = query.actorId;
    if (query.outcome) where.outcome = query.outcome;
    if (query.from && query.to) {
      where.createdAt = Between(new Date(query.from), new Date(query.to));
    }
    return where;
  }
}
