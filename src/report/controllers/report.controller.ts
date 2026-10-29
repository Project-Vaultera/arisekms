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
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileTypeValidator, MaxFileSizeValidator, ParseFilePipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  BaseApiErrorResponse,
  BaseApiResponse,
  SwaggerBaseApiResponse,
} from '../../shared/dtos/base-api-response.dto';
import { PaginationParamsDto } from '../../shared/dtos/pagination-params.dto';
import {
  ALLOWED_UPLOAD_MIMETYPES,
  MAX_UPLOAD_BYTES,
  multerMemoryOptions,
} from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { CreateReportInput, UpdateReportInput } from '../dtos/report-input.dto';
import { ReportOutput } from '../dtos/report-output.dto';
import { ReportService } from '../services/report.service';

const reportFilePipe = new ParseFilePipe({
  fileIsRequired: true,
  validators: [
    new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_BYTES }),
    new FileTypeValidator({ fileType: ALLOWED_UPLOAD_MIMETYPES, fallbackToMimetype: true }),
  ],
});

@ApiTags('reports')
@Controller('reports')
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ReportController.name);
  }

  @Post()
  @ApiOperation({ summary: 'Submit report API (pdf/jpg/png, one file per category)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(ReportOutput) })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
  async createReport(
    @ReqContext() ctx: RequestContext,
    @Body() input: CreateReportInput,
    @UploadedFile(reportFilePipe) file: Express.Multer.File,
  ): Promise<BaseApiResponse<ReportOutput>> {
    this.logger.log(ctx, `${this.createReport.name} was called`);

    const report = await this.reportService.createReport(ctx, input, file);
    return { data: report, meta: {} };
  }

  @Get()
  @ApiOperation({ summary: 'Get reports as a list API (own rows, all for admins)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse([ReportOutput]) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getReports(
    @ReqContext() ctx: RequestContext,
    @Query() query: PaginationParamsDto,
  ): Promise<BaseApiResponse<ReportOutput[]>> {
    this.logger.log(ctx, `${this.getReports.name} was called`);

    const { reports, count } = await this.reportService.getReports(ctx, query.limit, query.offset);
    return { data: reports, meta: { count } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by id API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(ReportOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getReport(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<BaseApiResponse<ReportOutput>> {
    this.logger.log(ctx, `${this.getReport.name} was called`);

    const report = await this.reportService.getReportById(ctx, id);
    return { data: report, meta: {} };
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Download report file API (author or admin)' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async downloadReport(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log(ctx, `${this.downloadReport.name} was called`);

    const file = await this.reportService.getReportFile(ctx, id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });
    return new StreamableFile(file.stream);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update report API (status is admin-only)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(ReportOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async updateReport(
    @ReqContext() ctx: RequestContext,
    @Param('id') reportId: number,
    @Body() input: UpdateReportInput,
  ): Promise<BaseApiResponse<ReportOutput>> {
    this.logger.log(ctx, `${this.updateReport.name} was called`);

    const report = await this.reportService.updateReport(ctx, reportId, input);
    return { data: report, meta: {} };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete report API' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteReport(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<void> {
    this.logger.log(ctx, `${this.deleteReport.name} was called`);

    await this.reportService.deleteReport(ctx, id);
  }
}
