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
  Put,
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

import { ROLE } from '../../auth/constants/role.constant';
import { Roles } from '../../auth/decorators/role.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  BaseApiErrorResponse,
  BaseApiResponse,
  SwaggerBaseApiResponse,
} from '../../shared/dtos/base-api-response.dto';
import {
  ALLOWED_UPLOAD_MIMETYPES,
  MAX_UPLOAD_BYTES,
  multerMemoryOptions,
} from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import {
  AddCompanyMemberInput,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../dtos/company-input.dto';
import { CompanyOutput } from '../dtos/company-output.dto';
import {
  AddRosterMemberInput,
  MembershipContactInput,
  ReviewMembershipInput,
  UpdateMembershipProfileInput,
  UploadMembershipDocInput,
} from '../dtos/membership-input.dto';
import { MembershipProfileOutput } from '../dtos/membership-output.dto';
import { CompanyService } from '../services/company.service';
import { MembershipService } from '../services/membership.service';

const membershipFilePipe = new ParseFilePipe({
  fileIsRequired: true,
  validators: [
    new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_BYTES }),
    new FileTypeValidator({ fileType: ALLOWED_UPLOAD_MIMETYPES, fallbackToMimetype: true }),
  ],
});

const logoFilePipe = new ParseFilePipe({
  fileIsRequired: true,
  validators: [
    new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_BYTES }),
    new FileTypeValidator({ fileType: 'image/jpeg|image/png', fallbackToMimetype: true }),
  ],
});

@ApiTags('companies')
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly membershipService: MembershipService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CompanyController.name);
  }

  @Post()
  @ApiOperation({ summary: 'Create company API (admin-only)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(CompanyOutput) })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN, ROLE.ARISE_SECRETARIAT)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async createCompany(
    @ReqContext() ctx: RequestContext,
    @Body() input: CreateCompanyInput,
  ): Promise<BaseApiResponse<CompanyOutput>> {
    this.logger.log(ctx, `${this.createCompany.name} was called`);

    const company = await this.companyService.createCompany(ctx, input);
    return { data: company, meta: {} };
  }

  @Post('apply')
  @ApiOperation({ summary: 'Apply for membership API (creates own company shell, one pending application per user)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(CompanyOutput) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async applyForCompany(
    @ReqContext() ctx: RequestContext,
    @Body() input: CreateCompanyInput,
  ): Promise<BaseApiResponse<CompanyOutput>> {
    this.logger.log(ctx, `${this.applyForCompany.name} was called`);

    const company = await this.companyService.applyForCompany(ctx, input.name);
    return { data: company, meta: {} };
  }

  @Get()
  @ApiOperation({ summary: 'Get companies API (all for admins, own for members)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse([CompanyOutput]) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getCompanies(
    @ReqContext() ctx: RequestContext,
  ): Promise<BaseApiResponse<CompanyOutput[]>> {
    this.logger.log(ctx, `${this.getCompanies.name} was called`);

    const companies = await this.companyService.getCompanies(ctx);
    return { data: companies, meta: { count: companies.length } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by id API (member of the company, or admin)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(CompanyOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getCompany(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<BaseApiResponse<CompanyOutput>> {
    this.logger.log(ctx, `${this.getCompany.name} was called`);

    const company = await this.companyService.getCompanyById(ctx, id);
    return { data: company, meta: {} };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company API (admin-only)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(CompanyOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN, ROLE.ARISE_SECRETARIAT)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async updateCompany(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Body() input: UpdateCompanyInput,
  ): Promise<BaseApiResponse<CompanyOutput>> {
    this.logger.log(ctx, `${this.updateCompany.name} was called`);

    const company = await this.companyService.updateCompany(ctx, id, input);
    return { data: company, meta: {} };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete company API (admin-only)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN, ROLE.ARISE_SECRETARIAT)
  @ApiBearerAuth()
  async deleteCompany(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<void> {
    this.logger.log(ctx, `${this.deleteCompany.name} was called`);

    await this.companyService.deleteCompany(ctx, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add company member API (admin-only, idempotent)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(CompanyOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN, ROLE.ARISE_SECRETARIAT)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async addMember(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Body() input: AddCompanyMemberInput,
  ): Promise<BaseApiResponse<CompanyOutput>> {
    this.logger.log(ctx, `${this.addMember.name} was called`);

    const company = await this.companyService.addMember(ctx, id, input);
    return { data: company, meta: {} };
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove company member API (admin-only, idempotent)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(CompanyOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN, ROLE.ARISE_SECRETARIAT)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async removeMember(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Param('userId') userId: number,
  ): Promise<BaseApiResponse<CompanyOutput>> {
    this.logger.log(ctx, `${this.removeMember.name} was called`);

    const company = await this.companyService.removeMember(ctx, id, userId);
    return { data: company, meta: {} };
  }

  @Get('membership/submissions')
  @ApiOperation({ summary: 'List submitted membership profiles API (admin-only)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse([MembershipProfileOutput]) })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN, ROLE.ARISE_SECRETARIAT)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async listSubmissions(
    @ReqContext() ctx: RequestContext,
  ): Promise<BaseApiResponse<MembershipProfileOutput[]>> {
    this.logger.log(ctx, `${this.listSubmissions.name} was called`);

    const profiles = await this.membershipService.listSubmissions(ctx);
    return { data: profiles, meta: { count: profiles.length } };
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'Get membership profile API (company member or admin)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getProfile(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.getProfile.name} was called`);

    return this.toProfile(await this.membershipService.getProfile(ctx, id));
  }

  @Put(':id/profile')
  @ApiOperation({ summary: 'Save membership profile draft API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async updateProfile(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Body() input: UpdateMembershipProfileInput,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.updateProfile.name} was called`);

    return this.toProfile(await this.membershipService.updateProfile(ctx, id, input));
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit membership profile for review API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async submitProfile(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.submitProfile.name} was called`);

    return this.toProfile(await this.membershipService.submitProfile(ctx, id));
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Approve or reject membership profile API (admin-only)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN, ROLE.ARISE_SECRETARIAT)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async reviewProfile(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Body() input: ReviewMembershipInput,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.reviewProfile.name} was called`);

    return this.toProfile(await this.membershipService.reviewProfile(ctx, id, input));
  }

  @Post(':id/contacts')
  @ApiOperation({ summary: 'Add membership contact API' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async createContact(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Body() input: MembershipContactInput,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.createContact.name} was called`);

    return this.toProfile(await this.membershipService.createContact(ctx, id, input));
  }

  @Patch(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Update membership contact API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async updateContact(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Param('contactId') contactId: number,
    @Body() input: MembershipContactInput,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.updateContact.name} was called`);

    return this.toProfile(await this.membershipService.updateContact(ctx, id, contactId, input));
  }

  @Delete(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Remove membership contact API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async deleteContact(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Param('contactId') contactId: number,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.deleteContact.name} was called`);

    return this.toProfile(await this.membershipService.deleteContact(ctx, id, contactId));
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload membership document API (pdf/doc/jpg/png)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
  async uploadDocument(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Body() input: UploadMembershipDocInput,
    @UploadedFile(membershipFilePipe) file: Express.Multer.File,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.uploadDocument.name} was called`);

    return this.toProfile(await this.membershipService.uploadDocument(ctx, id, input.kind, file));
  }

  @Delete(':id/documents/:docId')
  @ApiOperation({ summary: 'Delete membership document API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async deleteDocument(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Param('docId') docId: number,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.deleteDocument.name} was called`);

    return this.toProfile(await this.membershipService.deleteDocument(ctx, id, docId));
  }

  @Get(':id/documents/:docId/file')
  @ApiOperation({ summary: 'Download membership document API' })
  @ApiResponse({ status: HttpStatus.OK })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async downloadDocument(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Param('docId') docId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log(ctx, `${this.downloadDocument.name} was called`);

    const file = await this.membershipService.getDocumentFile(ctx, id, docId);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });
    return new StreamableFile(file.stream);
  }

  @Post(':id/logo')
  @ApiOperation({ summary: 'Upload company logo API (jpg/png)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
  async uploadLogo(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @UploadedFile(logoFilePipe) file: Express.Multer.File,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.uploadLogo.name} was called`);

    return this.toProfile(await this.membershipService.uploadLogo(ctx, id, file));
  }

  @Get(':id/logo/file')
  @ApiOperation({ summary: 'Download company logo API' })
  @ApiResponse({ status: HttpStatus.OK })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async downloadLogo(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log(ctx, `${this.downloadLogo.name} was called`);

    const file = await this.membershipService.getLogoFile(ctx, id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.filename}"`,
    });
    return new StreamableFile(file.stream);
  }

  @Post(':id/roster')
  @ApiOperation({ summary: 'Add company member by username API (member-scoped, idempotent)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async addRosterMember(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Body() input: AddRosterMemberInput,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.addRosterMember.name} was called`);

    return this.toProfile(await this.membershipService.addRosterMember(ctx, id, input.username));
  }

  @Delete(':id/roster/:userId')
  @ApiOperation({ summary: 'Remove company member API (member-scoped, cannot remove self)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(MembershipProfileOutput) })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async removeRosterMember(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
    @Param('userId') userId: number,
  ): Promise<BaseApiResponse<MembershipProfileOutput>> {
    this.logger.log(ctx, `${this.removeRosterMember.name} was called`);

    return this.toProfile(await this.membershipService.removeRosterMember(ctx, id, userId));
  }

  private toProfile(
    profile: MembershipProfileOutput,
  ): BaseApiResponse<MembershipProfileOutput> {
    return { data: profile, meta: {} };
  }
}
