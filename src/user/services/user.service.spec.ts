import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { AuditService } from '../../audit/services/audit.service';
import { ROLE } from '../../auth/constants/role.constant';
import * as fileStorage from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { UpdateUserInput } from '../dtos/user-update-input.dto';
import { UpdateMyProfileInput } from '../dtos/user-update-me-input.dto';
import { User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from './user.service';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;

  const mockedRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    getById: jest.fn(),
  };

  const user = {
    id: 6,
    username: 'jhon',
    name: 'Jhon doe',
    roles: [ROLE.ARISE_MEMBER],
  };

  const mockedLogger = { setContext: jest.fn(), log: jest.fn() };

  beforeEach(async () => {
    mockedRepository.findOne.mockResolvedValue(null);
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockedRepository,
        },
        { provide: AppLogger, useValue: mockedLogger },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const ctx = new RequestContext();

  describe('createUser', () => {
    beforeEach(() => {
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(async () => 'hashed-password');

      jest
        .spyOn(mockedRepository, 'save')
        .mockImplementation(async (input) => ({ id: 6, ...input }));
    });

    it('should encrypt password before saving', async () => {
      const userInput = {
        name: user.name,
        username: user.username,
        password: 'plain-password',
        roles: [ROLE.ARISE_MEMBER],
        isAccountDisabled: false,
        email: 'randomUser@random.com',
      };

      await service.createUser(ctx, userInput);
      expect(bcrypt.hash).toBeCalledWith(userInput.password, 10);
    });

    it('should save user with encrypted password', async () => {
      const userInput = {
        name: user.name,
        username: user.username,
        password: 'plain-password',
        roles: [ROLE.ARISE_MEMBER],
        isAccountDisabled: false,
        email: 'randomUser@random.com',
      };

      await service.createUser(ctx, userInput);

      expect(mockedRepository.save).toBeCalledWith({
        name: user.name,
        username: user.username,
        password: 'hashed-password',
        roles: [ROLE.ARISE_MEMBER],
        isAccountDisabled: false,
        email: 'randomUser@random.com',
      });
    });

    it('should return serialized user', async () => {
      jest.spyOn(mockedRepository, 'save').mockImplementation(async (input) => {
        input.id = 6;
        return input;
      });

      const userInput = {
        name: user.name,
        username: user.username,
        password: 'plain-password',
        roles: [ROLE.ARISE_MEMBER],
        isAccountDisabled: false,
        email: 'randomUser@random.com',
      };

      const result = await service.createUser(ctx, userInput);

      expect(result).toEqual({
        id: user.id,
        name: userInput.name,
        username: userInput.username,
        roles: [ROLE.ARISE_MEMBER],
        isAccountDisabled: false,
        email: 'randomUser@random.com',
      });
      expect(result).not.toHaveProperty('password');
    });

    afterEach(() => {
      jest.resetAllMocks();
    });
  });

  describe('findById', () => {
    beforeEach(() => {
      jest
        .spyOn(mockedRepository, 'findOne')
        .mockImplementation(async () => user);
    });

    it('should find user from DB using given id', async () => {
      await service.findById(ctx, user.id);
      expect(mockedRepository.findOne).toBeCalledWith({
        where: { id: user.id },
      });
    });

    it('should return serialized user', async () => {
      const result = await service.findById(ctx, user.id);

      expect(result).toEqual({
        id: user.id,
        name: user.name,
        username: user.username,
        roles: [ROLE.ARISE_MEMBER],
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
    });
  });

  describe('getUserById', () => {
    beforeEach(() => {
      jest
        .spyOn(mockedRepository, 'getById')
        .mockImplementation(async () => user);
    });

    it('should find user from DB using given id', async () => {
      await service.getUserById(ctx, user.id);
      expect(mockedRepository.getById).toBeCalledWith(user.id);
    });

    it('should return serialized user', async () => {
      const result = await service.getUserById(ctx, user.id);

      expect(result).toEqual({
        id: user.id,
        name: user.name,
        username: user.username,
        roles: [ROLE.ARISE_MEMBER],
      });
    });

    it('throw not found exception if user is not found', async () => {
      mockedRepository.getById.mockRejectedValue(new NotFoundException());
      try {
        await service.getUserById(ctx, 100);
      } catch (error: any) {
        expect(error.constructor).toBe(NotFoundException);
      }
    });

    afterEach(() => {
      jest.resetAllMocks();
    });
  });

  describe('validateUsernamePassword', () => {
    it('should fail when username is invalid', async () => {
      jest
        .spyOn(mockedRepository, 'findOne')
        .mockImplementation(async () => null);

      await expect(
        service.validateUsernamePassword(ctx, 'jhon', 'password'),
      ).rejects.toThrowError();
    });

    it('should fail when password is invalid', async () => {
      jest
        .spyOn(mockedRepository, 'findOne')
        .mockImplementation(async () => user);

      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      await expect(
        service.validateUsernamePassword(ctx, 'jhon', 'password'),
      ).rejects.toThrowError();
    });

    it('should return  user  when credentials are valid', async () => {
      jest
        .spyOn(mockedRepository, 'findOne')
        .mockImplementation(async () => user);

      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      const result = await service.validateUsernamePassword(
        ctx,
        'jhon',
        'password',
      );

      expect(result).toEqual({
        id: user.id,
        name: user.name,
        username: user.username,
        roles: [ROLE.ARISE_MEMBER],
      });
    });
  });

  describe('getUsers', () => {
    it('gets users as a list', async () => {
      const offset = 0;
      const limit = 0;
      mockedRepository.findAndCount.mockResolvedValue([[user], 1]);
      await service.getUsers(ctx, limit, offset);
      expect(mockedRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('findByUsername', () => {
    beforeEach(() => {
      jest
        .spyOn(mockedRepository, 'findOne')
        .mockImplementation(async () => user);
    });

    it('should find user from DB using given username', async () => {
      await service.findByUsername(ctx, user.username);
      expect(mockedRepository.findOne).toBeCalledWith({
        where: {
          username: user.username,
        },
      });
    });

    it('should return serialized user', async () => {
      const result = await service.findByUsername(ctx, user.username);

      expect(result).toEqual({
        id: user.id,
        name: user.name,
        username: user.username,
        roles: [ROLE.ARISE_MEMBER],
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
    });
  });

  describe('updateUser', () => {
    it('should call repository.save with correct input', async () => {
      const userId = 1;
      const input: UpdateUserInput = {
        name: 'Test',
        password: 'updated-password',
      };

      const currentDate = new Date();

      const foundUser: User = {
        id: userId,
        name: 'Default User',
        username: 'default-user',
        password: 'random-password',
        roles: [ROLE.ARISE_MEMBER],
        isAccountDisabled: false,
        tokenVersion: 0,
        email: 'randomUser@random.com',
        avatarOriginalName: null,
        avatarStoredName: null,
        createdAt: currentDate,
        updatedAt: currentDate,
        articles: [],
      };

      mockedRepository.getById.mockResolvedValue(foundUser);

      const expected: User = {
        id: 1,
        name: input.name,
        username: 'default-user',
        password: input.password,
        roles: [ROLE.ARISE_MEMBER],
        isAccountDisabled: false,
        tokenVersion: 1,
        email: 'randomUser@random.com',
        avatarOriginalName: null,
        avatarStoredName: null,
        createdAt: currentDate,
        updatedAt: currentDate,
        articles: [],
      };

      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(async () => 'updated-password');

      await service.updateUser(ctx, userId, input);
      expect(mockedRepository.save).toHaveBeenCalledWith(expected);
    });

    it('should throw not found exception if user not found', async () => {
      const userId = 1;
      const input: UpdateUserInput = {
        name: 'Test',
        password: 'updated-password',
      };

      mockedRepository.getById.mockRejectedValue(new NotFoundException());

      try {
        await service.updateUser(ctx, userId, input);
      } catch (error: any) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });

    it('should record an audit row on role change and disable', async () => {
      const userId = 1;
      const foundUser: User = {
        id: userId,
        name: 'Default User',
        username: 'default-user',
        password: 'random-password',
        roles: [ROLE.ARISE_MEMBER],
        isAccountDisabled: false,
        tokenVersion: 0,
        email: 'randomUser@random.com',
        avatarOriginalName: null,
        avatarStoredName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        articles: [],
      };
      mockedRepository.getById.mockResolvedValue(foundUser);
      mockedRepository.save.mockResolvedValue(foundUser);

      const audit = (service as any).auditService;
      await service.updateUser(ctx, userId, {
        roles: [ROLE.ARISE_DATA_ANALYST],
        isAccountDisabled: true,
      } as UpdateUserInput);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_ROLE_CHANGED', entityId: '1' }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_ACCESS_TOGGLED', entityId: '1' }),
      );
    });
  });

  describe('updateMyProfile', () => {
    const baseUser: User = {
      id: 6,
      name: 'Jhon doe',
      username: 'jhon',
      password: 'old-hash',
      roles: [ROLE.ARISE_MEMBER],
      isAccountDisabled: false,
      tokenVersion: 0,
      email: 'jhon@random.com',
      avatarOriginalName: null,
      avatarStoredName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      articles: [],
    };

    it('hashes a new password, bumps tokenVersion, and audits', async () => {
      mockedRepository.save.mockClear();
      mockedRepository.getById.mockResolvedValue({ ...baseUser });
      mockedRepository.findOne.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'new-hash');
      jest.spyOn(service, 'validateUsernamePassword').mockResolvedValue({ ...baseUser } as never);

      const input: UpdateMyProfileInput = { currentPassword: 'old-pass', password: 'new-password-123' };
      await service.updateMyProfile(ctx, 6, input);

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'new-hash', tokenVersion: 1 }),
      );
      expect((service as any).auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_PASSWORD_CHANGED', entityId: '6' }),
      );
    });

    it('leaves password and tokenVersion alone without a password input', async () => {
      mockedRepository.save.mockClear();
      mockedRepository.getById.mockResolvedValue({ ...baseUser });
      mockedRepository.findOne.mockResolvedValue(null);

      const input: UpdateMyProfileInput = { name: 'New Name' };
      await service.updateMyProfile(ctx, 6, input);

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name', password: 'old-hash', tokenVersion: 0 }),
      );
    });

    it('rejects a password change without the current password', async () => {
      mockedRepository.getById.mockResolvedValue({ ...baseUser });

      await expect(
        service.updateMyProfile(ctx, 6, { password: 'new-password-123' }),
      ).rejects.toThrow('Current password is required.');
    });

    it('rejects an already-used email', async () => {
      mockedRepository.getById.mockResolvedValue({ ...baseUser });
      mockedRepository.findOne.mockResolvedValue({ ...baseUser, id: 7 });

      await expect(
        service.updateMyProfile(ctx, 6, { email: 'taken@random.com' }),
      ).rejects.toThrow('Email is already in use.');
    });
  });

  describe('revokeMySessions', () => {
    it('bumps tokenVersion and records an audit row', async () => {
      mockedRepository.save.mockClear();
      const foundUser: User = {
        id: 6,
        name: 'Jhon doe',
        username: 'jhon',
        password: 'old-hash',
        roles: [ROLE.ARISE_MEMBER],
        isAccountDisabled: false,
        tokenVersion: 2,
        email: 'jhon@random.com',
        avatarOriginalName: null,
        avatarStoredName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        articles: [],
      };
      mockedRepository.getById.mockResolvedValue(foundUser);

      await service.revokeMySessions(ctx, 6);

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ tokenVersion: 3 }),
      );
      expect((service as any).auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_SESSIONS_REVOKED', entityId: '6' }),
      );
    });
  });

  describe('avatar', () => {
    beforeEach(() => {
      jest.spyOn(fileStorage, 'persistUpload').mockReturnValue('stored-avatar.png');
      jest.spyOn(fileStorage, 'removeUploadFile').mockReturnValue(undefined);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });
    const baseUser: User = {
      id: 6,
      name: 'Jhon doe',
      username: 'jhon',
      password: 'old-hash',
      roles: [ROLE.ARISE_MEMBER],
      isAccountDisabled: false,
      tokenVersion: 0,
      email: 'jhon@random.com',
      avatarOriginalName: null,
      avatarStoredName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      articles: [],
    };

    it('stores the uploaded avatar names', async () => {
      mockedRepository.save.mockClear();
      mockedRepository.getById.mockResolvedValue({ ...baseUser });
      const file = { originalname: 'me.png', buffer: Buffer.from('fake-image') } as Express.Multer.File;

      await service.uploadAvatar(ctx, 6, file);

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarOriginalName: 'me.png',
          avatarStoredName: expect.stringMatching(/\.png$/),
        }),
      );
    });

    it('clears the avatar on remove', async () => {
      mockedRepository.save.mockClear();
      mockedRepository.getById.mockResolvedValue({
        ...baseUser,
        avatarOriginalName: 'me.png',
        avatarStoredName: 'missing-file.png',
      });

      await service.removeAvatar(ctx, 6);

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ avatarOriginalName: null, avatarStoredName: null }),
      );
    });

    it('throws not found when no avatar is set', async () => {
      mockedRepository.getById.mockResolvedValue({ ...baseUser });

      await expect(service.getAvatarFile(ctx, 6)).rejects.toThrow('No avatar set.');
    });
  });
});
