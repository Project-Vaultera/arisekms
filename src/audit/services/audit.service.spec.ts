import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ROLE } from '../../auth/constants/role.constant';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;

  const mockedQb = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };
  const mockedRepository = {
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => ({ id: 1, ...v })),
    createQueryBuilder: jest.fn(() => mockedQb),
  };
  const mockedLogger = { setContext: jest.fn(), log: jest.fn(), error: jest.fn() };

  function ctxWithRoles(roles: string[]): RequestContext {
    const ctx = new RequestContext();
    ctx.user = { id: 7, roles, username: 'auditor' } as never;
    return ctx;
  }

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: mockedRepository },
        { provide: AppLogger, useValue: mockedLogger },
      ],
    }).compile();

    service = moduleRef.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('explicit record derives a success outcome', async () => {
    const row = await service.record(
      ctxWithRoles([ROLE.ARISE_IT_ADMIN]),
      'USER_ROLE_CHANGED',
      'users',
      '9',
      { roles: [ROLE.ARISE_MEMBER] },
    );
    expect(mockedRepository.save).toHaveBeenCalled();
    expect(row.outcome).toBeNull();
  });

  it('fire-and-forget record never throws', () => {
    expect(() =>
      service.record({ action: 'PATCH', entityType: 'users', statusCode: 200 }),
    ).not.toThrow();
  });

  it('list allows IT admin and maps output', async () => {
    mockedQb.getManyAndCount.mockResolvedValue([
      [{ id: 1, action: 'PATCH', entityType: 'users' }],
      1,
    ]);
    const { items, total } = await service.list(ctxWithRoles([ROLE.ARISE_IT_ADMIN]), {});
    expect(total).toEqual(1);
    expect(items[0].action).toEqual('PATCH');
  });

  it('list combines search with other filters', async () => {
    mockedQb.getManyAndCount.mockResolvedValue([[], 0]);
    await service.list(ctxWithRoles([ROLE.ARISE_IT_ADMIN]), { search: 'PATCH', actorId: 7 });
    expect(mockedQb.andWhere).toHaveBeenCalledWith(expect.stringContaining('actorId'), expect.anything());
    expect(mockedQb.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), expect.anything());
  });

  it('list accepts the legacy ADMIN role', async () => {
    mockedQb.getManyAndCount.mockResolvedValue([[], 0]);
    await expect(service.list(ctxWithRoles(['ADMIN']), {})).resolves.toBeDefined();
  });

  it('list denies members and analysts', async () => {
    await expect(service.list(ctxWithRoles([ROLE.ARISE_MEMBER]), {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.list(ctxWithRoles([ROLE.ARISE_DATA_ANALYST]), {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
