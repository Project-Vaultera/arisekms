import { BadRequestException, Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
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
    const safeLimit = Math.min(Math.max(query.limit ?? 20, 1), 500);
    const safeOffset = Math.max(query.offset ?? 0, 0);
    const page = Math.floor(safeOffset / safeLimit) + 1;
    const parsedActorId = actorId !== undefined ? Number(actorId) : undefined;
    if (parsedActorId !== undefined && (!Number.isInteger(parsedActorId) || parsedActorId <= 0)) {
      throw new BadRequestException('actorId must be a positive integer');
    }
    for (const [label, value] of [['from', from], ['to', to]] as const) {
      if (value !== undefined && Number.isNaN(new Date(value).getTime())) {
        throw new BadRequestException(`${label} must be a valid date`);
      }
    }
    const { items, total } = await this.auditService.list(ctx, {
      action,
      entityType,
      actorId: parsedActorId,
      outcome,
      from,
      to,
      search,
      page,
      limit: safeLimit,
    });
    return { data: items, meta: { count: total } };
  }
}
