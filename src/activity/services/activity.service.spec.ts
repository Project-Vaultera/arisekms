import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ROLE } from '../../auth/constants/role.constant';
import { CompanyService } from '../../company/services/company.service';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { UserService } from '../../user/services/user.service';
import { UpdateActivityInput } from '../dtos/activity-input.dto';
import { Activity, ActivityStatus } from '../entities/activity.entity';
import { ActivityRepository } from '../repositories/activity.repository';
import { ActivityService } from './activity.service';
import { ActivityAclService } from './activity-acl.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let mockedRepository: any;
  const mockedLogger = { setContext: jest.fn(), log: jest.fn() };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: ActivityRepository,
          useValue: { save: jest.fn(), getById: jest.fn() },
        },
        { provide: UserService, useValue: {} },
        { provide: CompanyService, useValue: {} },
        { provide: ActivityAclService, useValue: new ActivityAclService() },
        { provide: AppLogger, useValue: mockedLogger },
      ],
    }).compile();

    service = moduleRef.get<ActivityService>(ActivityService);
    mockedRepository = moduleRef.get(ActivityRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const ctx = new RequestContext();

  function ownActivity() {
    return { id: 1, status: ActivityStatus.SUBMITTED, createdBy: { id: 1 } } as Activity;
  }

  describe('updateActivity status rules', () => {
    it('should drop status changes by the author', async () => {
      ctx.user = { id: 1, roles: [ROLE.USER], username: 'member' };
      const input: UpdateActivityInput = { status: ActivityStatus.APPROVED };
      mockedRepository.getById.mockResolvedValue(ownActivity());
      mockedRepository.save.mockImplementation(async (a: Activity) => a);

      await service.updateActivity(ctx, 1, input);
      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ActivityStatus.SUBMITTED }),
      );
    });

    it('should let admins set any status', async () => {
      ctx.user = { id: 9, roles: [ROLE.ADMIN], username: 'admin' };
      const input: UpdateActivityInput = { status: ActivityStatus.APPROVED };
      mockedRepository.getById.mockResolvedValue(ownActivity());
      mockedRepository.save.mockImplementation(async (a: Activity) => a);

      await service.updateActivity(ctx, 1, input);
      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ActivityStatus.APPROVED }),
      );
    });

    it('should reject updates by non-authors', async () => {
      ctx.user = { id: 2, roles: [ROLE.USER], username: 'other' };
      mockedRepository.getById.mockResolvedValue(ownActivity());

      await expect(
        service.updateActivity(ctx, 1, { title: 'hijack' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mockedRepository.save).not.toHaveBeenCalled();
    });
  });
});
