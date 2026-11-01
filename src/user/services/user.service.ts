import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { plainToClass } from 'class-transformer';
import { createReadStream } from 'fs';
import { basename, join } from 'path';

import { AuditService } from '../../audit/services/audit.service';
import { clampPagination } from '../../shared/dtos/pagination-params.dto';
import { persistUpload, removeUploadFile, UPLOADS_DIR } from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { CreateUserInput } from '../dtos/user-create-input.dto';
import { UserOutput } from '../dtos/user-output.dto';
import { UpdateUserInput } from '../dtos/user-update-input.dto';
import { UpdateMyProfileInput } from '../dtos/user-update-me-input.dto';
import { User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    private repository: UserRepository,
    private auditService: AuditService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(UserService.name);
  }
  async createUser(
    ctx: RequestContext,
    input: CreateUserInput,
  ): Promise<UserOutput> {
    this.logger.log(ctx, `${this.createUser.name} was called`);

    const clash = await this.repository.findOne({
      where: [{ username: input.username }, { email: input.email }],
    });
    if (clash) {
      throw new ConflictException('Username or email is already in use.');
    }

    const user = plainToClass(User, input);

    user.password = await hash(input.password, 10);

    this.logger.log(ctx, `calling ${UserRepository.name}.saveUser`);
    try {
      await this.repository.save(user);
    } catch (e) {
      // Race: two concurrent signups pass the pre-check, DB unique wins.
      if (e && typeof e === 'object' && (e as { code?: string }).code === '23505') {
        throw new ConflictException('Username or email is already in use.');
      }
      throw e;
    }

    return plainToClass(UserOutput, user, {
      excludeExtraneousValues: true,
    });
  }

  async validateUsernamePassword(
    ctx: RequestContext,
    username: string,
    pass: string,
  ): Promise<UserOutput> {
    this.logger.log(ctx, `${this.validateUsernamePassword.name} was called`);

    this.logger.log(ctx, `calling ${UserRepository.name}.findOne`);
    const user = await this.repository.findOne({ where: { username } });
    if (!user) throw new UnauthorizedException();

    const match = await compare(pass, user.password);
    if (!match) throw new UnauthorizedException();

    return plainToClass(UserOutput, user, {
      excludeExtraneousValues: true,
    });
  }

  async getUsers(
    ctx: RequestContext,
    limit: number,
    offset: number,
  ): Promise<{ users: UserOutput[]; count: number }> {
    this.logger.log(ctx, `${this.getUsers.name} was called`);

    this.logger.log(ctx, `calling ${UserRepository.name}.findAndCount`);
    const [users, count] = await this.repository.findAndCount({
      where: {},
      take: clampPagination(limit, offset).take,
      skip: clampPagination(limit, offset).skip,
    });

    const usersOutput = plainToClass(UserOutput, users, {
      excludeExtraneousValues: true,
    });

    return { users: usersOutput, count };
  }

  async findById(ctx: RequestContext, id: number): Promise<UserOutput> {
    this.logger.log(ctx, `${this.findById.name} was called`);

    this.logger.log(ctx, `calling ${UserRepository.name}.findOne`);
    const user = await this.repository.findOne({ where: { id } });

    return plainToClass(UserOutput, user, {
      excludeExtraneousValues: true,
    });
  }

  async getUserById(ctx: RequestContext, id: number): Promise<UserOutput> {
    this.logger.log(ctx, `${this.getUserById.name} was called`);

    this.logger.log(ctx, `calling ${UserRepository.name}.getById`);
    const user = await this.repository.getById(id);

    return plainToClass(UserOutput, user, {
      excludeExtraneousValues: true,
    });
  }

  async findByUsername(
    ctx: RequestContext,
    username: string,
  ): Promise<UserOutput> {
    this.logger.log(ctx, `${this.findByUsername.name} was called`);

    this.logger.log(ctx, `calling ${UserRepository.name}.findOne`);
    const user = await this.repository.findOne({ where: { username } });

    return plainToClass(UserOutput, user, {
      excludeExtraneousValues: true,
    });
  }

  async updateMyProfile(
    ctx: RequestContext,
    userId: number,
    input: UpdateMyProfileInput,
  ): Promise<UserOutput> {
    this.logger.log(ctx, `${this.updateMyProfile.name} was called`);

    const user = await this.repository.getById(userId);

    // Email change must stay unique across accounts.
    if (input.email && input.email !== user.email) {
      const taken = await this.repository.findOne({ where: { email: input.email } });
      if (taken && taken.id !== user.id) {
        throw new ConflictException('Email is already in use.');
      }
    }

    // Whitelist merge: only name + email + gender + password are self-editable.
    // A password change bumps tokenVersion so every device (including this
    // one) signs out — the caller must redirect to login afterwards.
    const newPassword = input.password;
    const passwordChanged = newPassword !== undefined;
    if (passwordChanged) {
      if (!input.currentPassword) {
        throw new UnauthorizedException('Current password is required.');
      }
      // Throws Unauthorized when the current password does not match.
      await this.validateUsernamePassword(ctx, user.username, input.currentPassword);
    }
    const updatedUser: User = {
      ...user,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.gender !== undefined ? { gender: input.gender } : {}),
      ...(passwordChanged ? { password: await hash(newPassword, 10) } : {}),
      ...(passwordChanged ? { tokenVersion: (user.tokenVersion ?? 0) + 1 } : {}),
    };

    this.logger.log(ctx, `calling ${UserRepository.name}.save`);
    await this.repository.save(updatedUser);

    if (passwordChanged) {
      this.auditService.record({
        actorId: ctx.user?.id ?? null,
        action: 'USER_PASSWORD_CHANGED',
        entityType: 'users',
        entityId: String(userId),
        metadata: {},
        outcome: 'success',
      });
    }

    return plainToClass(UserOutput, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async revokeMySessions(ctx: RequestContext, userId: number): Promise<UserOutput> {
    this.logger.log(ctx, `${this.revokeMySessions.name} was called`);

    const user = await this.repository.getById(userId);
    const updatedUser: User = { ...user, tokenVersion: (user.tokenVersion ?? 0) + 1 };

    this.logger.log(ctx, `calling ${UserRepository.name}.save`);
    await this.repository.save(updatedUser);

    this.auditService.record({
      actorId: ctx.user?.id ?? null,
      action: 'USER_SESSIONS_REVOKED',
      entityType: 'users',
      entityId: String(userId),
      metadata: {},
      outcome: 'success',
    });

    return plainToClass(UserOutput, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async uploadAvatar(
    ctx: RequestContext,
    userId: number,
    file: Express.Multer.File,
  ): Promise<UserOutput> {
    this.logger.log(ctx, `${this.uploadAvatar.name} was called`);

    const user = await this.repository.getById(userId);
    removeUploadFile(user.avatarStoredName);
    const updatedUser: User = {
      ...user,
      avatarStoredName: persistUpload(file),
      avatarOriginalName: file.originalname,
    };

    this.logger.log(ctx, `calling ${UserRepository.name}.save`);
    await this.repository.save(updatedUser);

    return plainToClass(UserOutput, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async getAvatarFile(
    ctx: RequestContext,
    userId: number,
  ): Promise<{ stream: ReturnType<typeof createReadStream>; filename: string; mimeType: string }> {
    this.logger.log(ctx, `${this.getAvatarFile.name} was called`);

    const user = await this.repository.getById(userId);
    if (!user.avatarStoredName) {
      throw new NotFoundException('No avatar set.');
    }
    return {
      stream: createReadStream(join(process.cwd(), UPLOADS_DIR, basename(user.avatarStoredName))),
      filename: user.avatarOriginalName ?? 'avatar',
      mimeType: 'image/png',
    };
  }

  async removeAvatar(ctx: RequestContext, userId: number): Promise<UserOutput> {
    this.logger.log(ctx, `${this.removeAvatar.name} was called`);

    const user = await this.repository.getById(userId);
    removeUploadFile(user.avatarStoredName);
    const updatedUser: User = { ...user, avatarStoredName: null, avatarOriginalName: null };

    this.logger.log(ctx, `calling ${UserRepository.name}.save`);
    await this.repository.save(updatedUser);

    return plainToClass(UserOutput, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async updateUser(
    ctx: RequestContext,
    userId: number,
    input: UpdateUserInput,
  ): Promise<UserOutput> {
    this.logger.log(ctx, `${this.updateUser.name} was called`);

    this.logger.log(ctx, `calling ${UserRepository.name}.getById`);
    const user = await this.repository.getById(userId);

    // Admins cannot disable their own account (route params arrive as strings).
    if (input.isAccountDisabled === true && Number(ctx.user?.id) === Number(userId)) {
      throw new ForbiddenException('You cannot disable your own account.');
    }

    // Admins cannot change their own role (prevents accidental lockout).
    if (input.roles !== undefined && Number(ctx.user?.id) === Number(userId)) {
      throw new ForbiddenException('You cannot change your own role.');
    }

    // Hash the password if it exists in the input payload.
    if (input.password) {
      input.password = await hash(input.password, 10);
    }

    // merges the input (2nd line) to the found user (1st line)
    // Bump tokenVersion on sensitive changes so old access/refresh tokens stop working.
    const sensitiveChanged =
      input.roles !== undefined || input.isAccountDisabled !== undefined || input.password !== undefined;
    const updatedUser: User = {
      ...user,
      ...input,
      ...(sensitiveChanged ? { tokenVersion: (user.tokenVersion ?? 0) + 1 } : {}),
    };

    this.logger.log(ctx, `calling ${UserRepository.name}.save`);
    await this.repository.save(updatedUser);

    if (input.roles !== undefined) {
      this.auditService.record({
        actorId: ctx.user?.id ?? null,
        action: 'USER_ROLE_CHANGED',
        entityType: 'users',
        entityId: String(userId),
        metadata: { roles: input.roles },
        outcome: 'success',
      });
    }
    if (input.isAccountDisabled !== undefined) {
      this.auditService.record({
        actorId: ctx.user?.id ?? null,
        action: 'USER_ACCESS_TOGGLED',
        entityType: 'users',
        entityId: String(userId),
        metadata: { isAccountDisabled: input.isAccountDisabled },
        outcome: 'success',
      });
    }

    return plainToClass(UserOutput, updatedUser, {
      excludeExtraneousValues: true,
    });
  }
}
