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
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
} from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { CreateUserInput } from '../dtos/user-create-input.dto';
import { UserOutput } from '../dtos/user-output.dto';
import { UpdateUserInput } from '../dtos/user-update-input.dto';
import { UpdateMyProfileInput } from '../dtos/user-update-me-input.dto';
import { UserService } from '../services/user.service';

const avatarFilePipe = uploadFilePipe('image/jpeg|image/png');

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(UserController.name);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('me')
  @ApiOperation({
    summary: 'Get user me API',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(UserOutput),
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    type: BaseApiErrorResponse,
  })
  async getMyProfile(
    @ReqContext() ctx: RequestContext,
  ): Promise<BaseApiResponse<UserOutput>> {
    this.logger.log(ctx, `${this.getMyProfile.name} was called`);

    const user = await this.userService.findById(ctx, ctx.user!.id);
    return { data: user, meta: {} };
  }

  // Declared before ':id' routes so 'me' is never swallowed as a param.
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @Patch('me')
  @ApiOperation({
    summary: 'Update own profile API (name + email + gender + password)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(UserOutput),
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    type: BaseApiErrorResponse,
  })
  async updateMyProfile(
    @ReqContext() ctx: RequestContext,
    @Body() input: UpdateMyProfileInput,
  ): Promise<BaseApiResponse<UserOutput>> {
    this.logger.log(ctx, `${this.updateMyProfile.name} was called`);

    const user = await this.userService.updateMyProfile(ctx, ctx.user!.id, input);
    return { data: user, meta: {} };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('me/sessions/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign out all devices API (bumps tokenVersion, including this device)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(UserOutput),
  })
  async revokeMySessions(
    @ReqContext() ctx: RequestContext,
  ): Promise<BaseApiResponse<UserOutput>> {
    this.logger.log(ctx, `${this.revokeMySessions.name} was called`);

    const user = await this.userService.revokeMySessions(ctx, ctx.user!.id);
    return { data: user, meta: {} };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload own avatar API (jpg/png)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(UserOutput) })
  async uploadAvatar(
    @ReqContext() ctx: RequestContext,
    @UploadedFile(avatarFilePipe) file: Express.Multer.File,
  ): Promise<BaseApiResponse<UserOutput>> {
    this.logger.log(ctx, `${this.uploadAvatar.name} was called`);

    const user = await this.userService.uploadAvatar(ctx, ctx.user!.id, file);
    return { data: user, meta: {} };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me/avatar/file')
  @ApiOperation({ summary: 'Download own avatar API' })
  @ApiResponse({ status: HttpStatus.OK })
  async downloadAvatar(
    @ReqContext() ctx: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log(ctx, `${this.downloadAvatar.name} was called`);

    const file = await this.userService.getAvatarFile(ctx, ctx.user!.id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${safeDownloadFilename(file.filename)}"`,
    });
    return new StreamableFile(file.stream);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove own avatar API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(UserOutput) })
  async removeAvatar(
    @ReqContext() ctx: RequestContext,
  ): Promise<BaseApiResponse<UserOutput>> {
    this.logger.log(ctx, `${this.removeAvatar.name} was called`);

    const user = await this.userService.removeAvatar(ctx, ctx.user!.id);
    return { data: user, meta: {} };
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get()
  @ApiOperation({
    summary: 'Get users as a list API',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse([UserOutput]),
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    type: BaseApiErrorResponse,
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN, ROLE.ARISE_SECRETARIAT)
  @ApiBearerAuth()
  async getUsers(
    @ReqContext() ctx: RequestContext,
    @Query() query: PaginationParamsDto,
  ): Promise<BaseApiResponse<UserOutput[]>> {
    this.logger.log(ctx, `${this.getUsers.name} was called`);

    const { users, count } = await this.userService.getUsers(
      ctx,
      query.limit,
      query.offset,
    );

    return { data: users, meta: { count } };
  }

  // IT-admin invite: create an account with an explicit role. Declared before
  // ':id' routes so 'invite' is never swallowed as a param.
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('invite')
  @ApiOperation({
    summary: 'Invite user API (IT-admin only, creates account with role)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: SwaggerBaseApiResponse(UserOutput),
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN)
  @ApiBearerAuth()
  async inviteUser(
    @ReqContext() ctx: RequestContext,
    @Body() input: CreateUserInput,
  ): Promise<BaseApiResponse<UserOutput>> {
    this.logger.log(ctx, `${this.inviteUser.name} was called`);

    const user = await this.userService.createUser(ctx, input);
    return { data: user, meta: {} };
  }

  // Admin-only: members use GET /me and PATCH /me.
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by id API',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(UserOutput),
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    type: BaseApiErrorResponse,
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN)
  @ApiBearerAuth()
  async getUser(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<BaseApiResponse<UserOutput>> {
    this.logger.log(ctx, `${this.getUser.name} was called`);

    const user = await this.userService.getUserById(ctx, id);
    return { data: user, meta: {} };
  }

  // Admin-only full update. Members self-serve via PATCH /me.
  @Patch(':id')
  @ApiOperation({
    summary: 'Update user API',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(UserOutput),
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    type: BaseApiErrorResponse,
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async updateUser(
    @ReqContext() ctx: RequestContext,
    @Param('id') userId: number,
    @Body() input: UpdateUserInput,
  ): Promise<BaseApiResponse<UserOutput>> {
    this.logger.log(ctx, `${this.updateUser.name} was called`);

    const user = await this.userService.updateUser(ctx, userId, input);
    return { data: user, meta: {} };
  }
}
