import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Param } from '@nestjs/common';
import { ApiOperation,ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';

import {
  BaseApiErrorResponse,
  BaseApiResponse,
  SwaggerBaseApiResponse,
} from '../../shared/dtos/base-api-response.dto';
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { InviteUserInput } from '../../user/dtos/user-invite-input.dto';
import { UserOutput } from '../../user/dtos/user-output.dto';
import { ROLE } from '../constants/role.constant';
import { Roles } from '../decorators/role.decorator';
import { LoginInput } from '../dtos/auth-login-input.dto';
import { RefreshTokenInput } from '../dtos/auth-refresh-token-input.dto';
import { RegisterInput } from '../dtos/auth-register-input.dto';
import { RegisterOutput } from '../dtos/auth-register-output.dto';
import { AuthTokenOutput } from '../dtos/auth-token-output.dto';
import {
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../dtos/password-reset.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { LoginThrottleGuard } from '../guards/login-throttle.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthService } from '../services/auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AuthController.name);
  }
  // Invite routes: moved here from UserController because AuthService owns the
  // token + mail plumbing, and importing AuthModule into UserModule would cycle.
  @Post('invite')
  @ApiOperation({ summary: 'Invite a user (IT admin); mails an accept link' })
  @ApiResponse({ status: HttpStatus.CREATED })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN)
  async inviteUser(
    @ReqContext() ctx: RequestContext,
    @Body() input: InviteUserInput,
  ): Promise<BaseApiResponse<UserOutput>> {
    this.logger.log(ctx, `${this.inviteUser.name} was called`);
    const user = await this.authService.inviteUser(ctx, input);
    return { data: user, meta: {} };
  }

  @Post('invite/:id/resend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Re-send an invite link (IT admin)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.ARISE_IT_ADMIN)
  async resendInvite(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<void> {
    this.logger.log(ctx, `${this.resendInvite.name} was called`);
    await this.authService.resendInvite(ctx, Number(id));
  }

  @Post('accept-invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a password from an invitation link' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST })
  async acceptInvite(
    @ReqContext() ctx: RequestContext,
    @Body() input: ResetPasswordInput,
  ): Promise<void> {
    this.logger.log(ctx, `${this.acceptInvite.name} was called`);
    await this.authService.resetPassword(ctx, input.token, input.password, 'invite');
  }

  // Always 202, even for an unknown address: anything else enumerates users.
  // Reuses the login throttle (see the guard); with no username in the body it
  // degrades to the per-IP bucket.
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(LoginThrottleGuard)
  @ApiOperation({ summary: 'Request a password-reset link by email' })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS })
  async forgotPassword(
    @ReqContext() ctx: RequestContext,
    @Body() input: ForgotPasswordInput,
  ): Promise<void> {
    this.logger.log(ctx, `${this.forgotPassword.name} was called`);
    await this.authService.forgotPassword(ctx, input.email.trim());
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(LoginThrottleGuard)
  @ApiOperation({ summary: 'Set a new password from a mailed link' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST })
  async resetPassword(
    @ReqContext() ctx: RequestContext,
    @Body() input: ResetPasswordInput,
  ): Promise<void> {
    this.logger.log(ctx, `${this.resetPassword.name} was called`);
    await this.authService.resetPassword(ctx, input.token, input.password);
  }

  @Post('login')
  @ApiOperation({
    summary: 'User login API',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(AuthTokenOutput),
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    type: BaseApiErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limited; honours the Retry-After header.',
    type: BaseApiErrorResponse,
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottleGuard, LocalAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  login(
    @ReqContext() ctx: RequestContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() credential: LoginInput,
  ): BaseApiResponse<AuthTokenOutput> {
    this.logger.log(ctx, `${this.login.name} was called`);

    const authToken = this.authService.login(ctx);
    return { data: authToken, meta: {} };
  }

  @Post('register')
  @UseGuards(LoginThrottleGuard)
  @ApiOperation({
    summary: 'User registration API',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limited; honours the Retry-After header.',
    type: BaseApiErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: SwaggerBaseApiResponse(RegisterOutput),
  })
  async registerLocal(
    @ReqContext() ctx: RequestContext,
    @Body() input: RegisterInput,
  ): Promise<BaseApiResponse<RegisterOutput>> {
    const registeredUser = await this.authService.register(ctx, input);
    return { data: registeredUser, meta: {} };
  }

  @Post('refresh-token')
  @ApiOperation({
    summary: 'Refresh access token API',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwaggerBaseApiResponse(AuthTokenOutput),
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    type: BaseApiErrorResponse,
  })
  @HttpCode(HttpStatus.OK)
  // No throttle: a refresh carries no username and happens on every expiry, so
  // it would spend the login budget rather than protect it.
  @UseGuards(JwtRefreshGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  async refreshToken(
    @ReqContext() ctx: RequestContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() credential: RefreshTokenInput,
  ): Promise<BaseApiResponse<AuthTokenOutput>> {
    this.logger.log(ctx, `${this.refreshToken.name} was called`);

    const authToken = await this.authService.refreshToken(ctx);
    return { data: authToken, meta: {} };
  }
}
