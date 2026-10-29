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
import { CreateCertificateInput, UpdateCertificateInput } from '../dtos/certificate-input.dto';
import { CertificateOutput } from '../dtos/certificate-output.dto';
import { LeaderboardEntryOutput } from '../dtos/leaderboard-output.dto';
import { CertificateService } from '../services/certificate.service';

@ApiTags('certificates')
@Controller('certificates')
export class CertificateController {
  constructor(
    private readonly certificateService: CertificateService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CertificateController.name);
  }

  @Post()
  @ApiOperation({ summary: 'Record SkillsBuild certificate API' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(CertificateOutput) })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async createCertificate(
    @ReqContext() ctx: RequestContext,
    @Body() input: CreateCertificateInput,
  ): Promise<BaseApiResponse<CertificateOutput>> {
    this.logger.log(ctx, `${this.createCertificate.name} was called`);

    const certificate = await this.certificateService.createCertificate(ctx, input);
    return { data: certificate, meta: {} };
  }

  @Get()
  @ApiOperation({ summary: 'Get certificates as a list API (own rows, all for admins)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse([CertificateOutput]) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getCertificates(
    @ReqContext() ctx: RequestContext,
    @Query() query: PaginationParamsDto,
  ): Promise<BaseApiResponse<CertificateOutput[]>> {
    this.logger.log(ctx, `${this.getCertificates.name} was called`);

    const { certificates, count } = await this.certificateService.getCertificates(ctx, query.limit, query.offset);
    return { data: certificates, meta: { count } };
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get SkillsBuild leaderboard (verified certificates)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse([LeaderboardEntryOutput]) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getLeaderboard(
    @ReqContext() ctx: RequestContext,
  ): Promise<BaseApiResponse<LeaderboardEntryOutput[]>> {
    this.logger.log(ctx, `${this.getLeaderboard.name} was called`);

    const board = await this.certificateService.getLeaderboard(ctx);
    return { data: board, meta: { count: board.length } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certificate by id API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(CertificateOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getCertificate(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<BaseApiResponse<CertificateOutput>> {
    this.logger.log(ctx, `${this.getCertificate.name} was called`);

    const certificate = await this.certificateService.getCertificateById(ctx, id);
    return { data: certificate, meta: {} };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Verify certificate API (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(CertificateOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async updateCertificate(
    @ReqContext() ctx: RequestContext,
    @Param('id') certificateId: number,
    @Body() input: UpdateCertificateInput,
  ): Promise<BaseApiResponse<CertificateOutput>> {
    this.logger.log(ctx, `${this.updateCertificate.name} was called`);

    const certificate = await this.certificateService.updateCertificate(ctx, certificateId, input);
    return { data: certificate, meta: {} };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete certificate API (admin only)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteCertificate(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<void> {
    this.logger.log(ctx, `${this.deleteCertificate.name} was called`);

    await this.certificateService.deleteCertificate(ctx, id);
  }
}
