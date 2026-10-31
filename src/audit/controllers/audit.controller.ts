import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ROLE } from '../../auth/constants/role.constant';
import { Roles } from '../../auth/decorators/role.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  BaseApiErrorResponse,
  BaseApiResponse,
  SwaggerBaseApiResponse,
} from '../../shared/dtos/base-api-response.dto';
import { PaginationParamsDto } from '../../shared/dtos/pagination-params.dto';
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { AuditLogOutput } from '../dtos/audit-log-output.dto';
import { AuditService } from '../services/audit.service';

@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AuditController.name);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List audit rows (IT admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse([AuditLogOutput]),
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    type: BaseApiErrorResponse,
  })
  async list(
    @ReqContext() ctx: RequestContext,
    @Query() query: PaginationParamsDto,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('actorId') actorId?: string,
    @Query('outcome') outcome?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ): Promise<BaseApiResponse<AuditLogOutput[]>> {
    this.logger.log(ctx, `${this.list.name} was called`);
    const limit = query.limit ?? 20;
    const page = Math.floor((query.offset ?? 0) / limit) + 1;
    const { items, total } = await this.auditService.list(ctx, {
      action,
      entityType,
      actorId: actorId !== undefined ? Number(actorId) : undefined,
      outcome,
      from,
      to,
      search,
      page,
      limit,
    });
    return { data: items, meta: { count: total } };
  }
}
