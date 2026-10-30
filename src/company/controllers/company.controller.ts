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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import {
  AddCompanyMemberInput,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../dtos/company-input.dto';
import { CompanyOutput } from '../dtos/company-output.dto';
import { CompanyService } from '../services/company.service';

@ApiTags('companies')
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CompanyController.name);
  }

  @Post()
  @ApiOperation({ summary: 'Create company API (admin-only)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(CompanyOutput) })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ADMIN)
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
  @Roles(ROLE.ADMIN)
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
  @Roles(ROLE.ADMIN)
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
  @Roles(ROLE.ADMIN)
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
  @Roles(ROLE.ADMIN)
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
}
