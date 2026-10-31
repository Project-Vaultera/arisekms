import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
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
import { CreateKnowledgeInput, UpdateKnowledgeInput } from '../dtos/knowledge-input.dto';
import { KnowledgeOutput } from '../dtos/knowledge-output.dto';
import { KnowledgeService } from '../services/knowledge.service';

const knowledgeFilePipe = new ParseFilePipe({
  fileIsRequired: true,
  validators: [
    new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_BYTES }),
    new FileTypeValidator({ fileType: ALLOWED_UPLOAD_MIMETYPES, fallbackToMimetype: true }),
  ],
});

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
  @ApiOperation({ summary: 'Upload knowledge document API (admin only)' })
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
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });
    return new StreamableFile(file.stream);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update knowledge document API (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(KnowledgeOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async updateDocument(
    @ReqContext() ctx: RequestContext,
    @Param('id') documentId: number,
    @Body() input: UpdateKnowledgeInput,
  ): Promise<BaseApiResponse<KnowledgeOutput>> {
    this.logger.log(ctx, `${this.updateDocument.name} was called`);

    const doc = await this.knowledgeService.updateDocument(ctx, documentId, input);
    return { data: doc, meta: {} };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete knowledge document API (admin only)' })
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
