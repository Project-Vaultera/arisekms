import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  BaseApiErrorResponse,
  BaseApiResponse,
  SwaggerBaseApiResponse,
} from '../../shared/dtos/base-api-response.dto';
import { PaginationParamsDto } from '../../shared/dtos/pagination-params.dto';
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { CreateActivityInput, UpdateActivityInput } from '../dtos/activity-input.dto';
import { ActivityOutput } from '../dtos/activity-output.dto';
import { ActivityService } from '../services/activity.service';

@ApiTags('activities')
@Controller('activities')
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ActivityController.name);
  }

  @Post()
  @ApiOperation({ summary: 'Log performance activity API' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(ActivityOutput) })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async createActivity(
    @ReqContext() ctx: RequestContext,
    @Body() input: CreateActivityInput,
  ): Promise<BaseApiResponse<ActivityOutput>> {
    this.logger.log(ctx, `${this.createActivity.name} was called`);

    const activity = await this.activityService.createActivity(ctx, input);
    return { data: activity, meta: {} };
  }

  @Get()
  @ApiOperation({ summary: 'Get activities as a list API (own rows, all for admins)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse([ActivityOutput]) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getActivities(
    @ReqContext() ctx: RequestContext,
    @Query() query: PaginationParamsDto,
  ): Promise<BaseApiResponse<ActivityOutput[]>> {
    this.logger.log(ctx, `${this.getActivities.name} was called`);

    const { activities, count } = await this.activityService.getActivities(ctx, query.limit, query.offset);
    return { data: activities, meta: { count } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get activity by id API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(ActivityOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getActivity(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<BaseApiResponse<ActivityOutput>> {
    this.logger.log(ctx, `${this.getActivity.name} was called`);

    const activity = await this.activityService.getActivityById(ctx, id);
    return { data: activity, meta: {} };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update activity API (status: admin only)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(ActivityOutput) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async updateActivity(
    @ReqContext() ctx: RequestContext,
    @Param('id') activityId: number,
    @Body() input: UpdateActivityInput,
  ): Promise<BaseApiResponse<ActivityOutput>> {
    this.logger.log(ctx, `${this.updateActivity.name} was called`);

    const activity = await this.activityService.updateActivity(ctx, activityId, input);
    return { data: activity, meta: {} };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete activity API' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteActivity(@ReqContext() ctx: RequestContext, @Param('id') id: number): Promise<void> {
    this.logger.log(ctx, `${this.deleteActivity.name} was called`);

    await this.activityService.deleteActivity(ctx, id);
  }
}
