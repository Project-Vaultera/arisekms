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
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

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
import {
  multerMemoryOptions,
  safeDownloadFilename,
  uploadFilePipe,
  uploadOptionalFilePipe } from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { CreateKnowledgeInput, ReviewKnowledgeInput, UpdateKnowledgeInput } from '../dtos/knowledge-input.dto';
import { KnowledgeOutput } from '../dtos/knowledge-output.dto';
import { KnowledgeService } from '../services/knowledge.service';


const knowledgeFilePipe = uploadFilePipe();
const knowledgeOptionalFilePipe = uploadOptionalFilePipe();

@ApiTags('knowledge')
@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(KnowledgeController.name);
  }

  @Post()
  @ApiOperation({ summary: 'Upload knowledge document API (staff publish live, members submit for review)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(KnowledgeOutput) })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
  async createDocument(
    @ReqContext() ctx: RequestContext,
    @Body() input: CreateKnowledgeInput,
    @UploadedFile(knowledgeFilePipe) file: Express.Multer.File,
  ): Promise<BaseApiResponse<KnowledgeOutput>> {
    this.logger.log(ctx, `${this.createDocument.name} was called`);

    const doc = await this.knowledgeService.createDocument(ctx, input, file);
    return { data: doc, meta: {} };
  }

  @Get()
  @ApiOperation({ summary: 'Get knowledge documents as a list API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse([KnowledgeOutput]) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getDocuments(
    @ReqContext() ctx: RequestContext,
    @Query() query: PaginationParamsDto,
  ): Promise<BaseApiResponse<KnowledgeOutput[]>> {
    this.logger.log(ctx, `${this.getDocuments.name} was called`);

    const { documents, count } = await this.knowledgeService.getDocuments(ctx, query.limit, query.offset);
    return { data: documents, meta: { count } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get knowledge document by id API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(KnowledgeOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getDocument(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<BaseApiResponse<KnowledgeOutput>> {
    this.logger.log(ctx, `${this.getDocument.name} was called`);

    const doc = await this.knowledgeService.getDocumentById(ctx, id);
    return { data: doc, meta: {} };
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Download knowledge document file API' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async downloadDocument(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log(ctx, `${this.downloadDocument.name} was called`);

    const file = await this.knowledgeService.getDocumentFile(ctx, id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${safeDownloadFilename(file.filename)}"`,
    });
    return new StreamableFile(file.stream);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update knowledge document API (author edits own pending docs, staff manage all; optional file replaces the upload)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(KnowledgeOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
  async updateDocument(
    @ReqContext() ctx: RequestContext,
    @Param('id') documentId: number,
    @Body() input: UpdateKnowledgeInput,
    @UploadedFile(knowledgeOptionalFilePipe) file?: Express.Multer.File,
  ): Promise<BaseApiResponse<KnowledgeOutput>> {
    this.logger.log(ctx, `${this.updateDocument.name} was called`);

    const doc = await this.knowledgeService.updateDocument(ctx, documentId, input, file);
    return { data: doc, meta: {} };
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Approve or reject knowledge document API (secretariat/admin-only)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(KnowledgeOutput) })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN, ROLE.ARISE_SECRETARIAT)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async reviewDocument(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Body() input: ReviewKnowledgeInput,
  ): Promise<BaseApiResponse<KnowledgeOutput>> {
    this.logger.log(ctx, `${this.reviewDocument.name} was called`);

    const doc = await this.knowledgeService.reviewDocument(ctx, id, input);
    return { data: doc, meta: {} };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get knowledge document activity timeline API (author or reviewer)' })
  @ApiResponse({ status: HttpStatus.OK })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getHistory(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<BaseApiResponse<unknown>> {
    this.logger.log(ctx, `${this.getHistory.name} was called`);

    const items = await this.knowledgeService.getHistory(ctx, id);
    return { data: items, meta: { count: items.length } };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete knowledge document API (author deletes own pending docs, staff manage all)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteDocument(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<void> {
    this.logger.log(ctx, `${this.deleteDocument.name} was called`);

    await this.knowledgeService.deleteDocument(ctx, id);
  }
}
