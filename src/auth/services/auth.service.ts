import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { plainToClass } from 'class-transformer';
import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';

import { AuditService } from '../../audit/services/audit.service';
import { MailService } from '../../mail/mail.service';
import { RESET_TOKEN_TTL_MINUTES } from '../../mail/mail.service';
import { INVITE_TOKEN_TTL_HOURS } from '../../mail/mail.service';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { InviteUserInput } from '../../user/dtos/user-invite-input.dto';
import { UserOutput } from '../../user/dtos/user-output.dto';
import { UserService } from '../../user/services/user.service';
import { ROLE } from '../constants/role.constant';
import { RegisterInput } from '../dtos/auth-register-input.dto';
import { RegisterOutput } from '../dtos/auth-register-output.dto';
import {
  AuthTokenOutput,
  UserAccessTokenClaims,
} from '../dtos/auth-token-output.dto';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
    private authTokenService: AuthTokenService,
    private mailService: MailService,
    private auditService: AuditService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async validateUser(
    ctx: RequestContext,
    username: string,
    pass: string,
  ): Promise<UserAccessTokenClaims> {
    this.logger.log(ctx, `${this.validateUser.name} was called`);

    // The userService will throw Unauthorized in case of invalid username/password.
    const user = await this.userService.validateUsernamePassword(
      ctx,
      username,
      pass,
    );

    // Prevent disabled users from logging in.
    if (user.isAccountDisabled) {
      throw new UnauthorizedException('This user account has been disabled');
    }

    const row = await this.dataSource.query(`SELECT "tokenVersion" FROM users WHERE id = $1`, [user.id]);

    return { ...user, tokenVersion: row?.[0]?.tokenVersion ?? 0 } as UserAccessTokenClaims;
  }

  login(ctx: RequestContext): AuthTokenOutput {
    this.logger.log(ctx, `${this.login.name} was called`);

    return this.getAuthToken(ctx, ctx.user!);
  }

  async register(
    ctx: RequestContext,
    input: RegisterInput,
  ): Promise<RegisterOutput> {
    this.logger.log(ctx, `${this.register.name} was called`);

    // TODO : Setting default role as ARISE_MEMBER here. Will add option to change this later via IT admin users.
    input.roles = [ROLE.ARISE_MEMBER];
    input.isAccountDisabled = false;

    const registeredUser = await this.userService.createUser(ctx, input);
    return plainToClass(RegisterOutput, registeredUser, {
      excludeExtraneousValues: true,
    });
  }

  async refreshToken(ctx: RequestContext): Promise<AuthTokenOutput> {
    this.logger.log(ctx, `${this.refreshToken.name} was called`);

    const user = await this.userService.findById(ctx, ctx.user!.id);
    if (!user) {
      throw new UnauthorizedException('Invalid user id');
    }
    const row = await this.dataSource.query(`SELECT "tokenVersion" FROM users WHERE id = $1`, [user.id]);

    return this.getAuthToken(ctx, { ...user, tokenVersion: row?.[0]?.tokenVersion ?? 0 } as never);
  }

  getAuthToken(
    ctx: RequestContext,
    user: UserAccessTokenClaims | UserOutput,
  ): AuthTokenOutput {
    this.logger.log(ctx, `${this.getAuthToken.name} was called`);

    const tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0;
    const subject = { sub: user.id, tokenVersion };
    const payload = {
      username: (user as { username?: string }).username,
      sub: user.id,
      roles: (user as { roles?: unknown }).roles,
      tokenVersion,
    };

    const authToken = {
      refreshToken: this.jwtService.sign(subject, {
        expiresIn: this.configService.get('jwt.refreshTokenExpiresInSec'),
      }),
      accessToken: this.jwtService.sign(
        { ...payload, ...subject },
        { expiresIn: this.configService.get('jwt.accessTokenExpiresInSec') },
      ),
    };
    return plainToClass(AuthTokenOutput, authToken, {
      excludeExtraneousValues: true,
    });
  }

  // Creates the account, then mails an accept link. Without a supplied password
  // the stored hash is random and unusable, so the account cannot be logged into
  // until the invitee sets one — that is the point of a token-based invite.
  async inviteUser(
    ctx: RequestContext,
    input: InviteUserInput,
  ): Promise<UserOutput> {
    this.logger.log(ctx, `${this.inviteUser.name} was called`);

    const explicitPassword = input.password;
    const created = await this.userService.createUser(ctx, {
      ...input,
      password: explicitPassword ?? randomBytes(32).toString('base64url'),
    } as never);

    if (!explicitPassword) {
      const token = await this.authTokenService.issue(
        created.id,
        'invite',
        INVITE_TOKEN_TTL_HOURS * 3_600_000,
        ctx.user?.id ?? null,
      );
      await this.mailService.sendInvite(created.name, created.email, token);
    }

    this.auditService.record({
      actorId: ctx.user?.id ?? null,
      action: 'USER_INVITED',
      entityType: 'users',
      entityId: String(created.id),
      metadata: { emailed: !explicitPassword },
      outcome: 'success',
    });

    return created;
  }

  // Re-issues an invite. The prior link stops working because consuming kills
  // siblings, and issuing does not need the account to be recreated.
  async resendInvite(ctx: RequestContext, userId: number): Promise<void> {
    this.logger.log(ctx, `${this.resendInvite.name} was called`);

    const user = await this.userService.findById(ctx, userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = await this.authTokenService.issue(
      user.id,
      'invite',
      INVITE_TOKEN_TTL_HOURS * 3_600_000,
      ctx.user?.id ?? null,
    );
    await this.mailService.sendInvite(user.name, user.email, token);

    this.auditService.record({
      actorId: ctx.user?.id ?? null,
      action: 'USER_INVITE_RESENT',
      entityType: 'users',
      entityId: String(user.id),
      metadata: {},
      outcome: 'success',
    });
  }

  // Always resolves: an unknown address must look identical to a known one, or
  // this endpoint becomes a user-enumeration oracle.
  async forgotPassword(ctx: RequestContext, email: string): Promise<void> {
    this.logger.log(ctx, `${this.forgotPassword.name} was called`);

    const user = await this.userService.findByEmail(email);
    if (!user) {
      return;
    }
    if (user.isAccountDisabled) {
      // Still send: a disabled user asking for a link is not an error.
    }

    const token = await this.authTokenService.issue(
      user.id,
      'password_reset',
      RESET_TOKEN_TTL_MINUTES * 60_000,
    );
    await this.mailService.sendPasswordReset(user.name, user.email, token);

    this.auditService.record({
      actorId: user.id,
      action: 'USER_PASSWORD_RESET_REQUESTED',
      entityType: 'users',
      entityId: String(user.id),
      metadata: {},
      outcome: 'success',
    });
  }

  // Throws a generic message for every failure mode: unknown, expired, used and
  // wrong-kind tokens are indistinguishable to the caller.
  async resetPassword(
    ctx: RequestContext,
    token: string,
    plainPassword: string,
    kind: 'password_reset' | 'invite' = 'password_reset',
  ): Promise<void> {
    this.logger.log(ctx, `${this.resetPassword.name} was called`);

    const consumed = await this.authTokenService.consumeWithoutUser(token, kind);
    if (!consumed) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    await this.userService.setPasswordFromToken(
      ctx,
      consumed.userId,
      plainPassword,
      kind === 'invite' ? 'USER_INVITE_ACCEPTED' : 'USER_PASSWORD_RESET',
    );
  }
}

const INVALID_TOKEN_MESSAGE =
  'This link is invalid or has expired. Request a new one.';
