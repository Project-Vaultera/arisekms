import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ROLE } from '../../auth/constants/role.constant';
import { CompanyService } from '../../company/services/company.service';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { UserService } from '../../user/services/user.service';
import { UpdateTicketInput } from '../dtos/ticket-input.dto';
import { SupportTicket, TicketStatus } from '../entities/support-ticket.entity';
import { TicketRepository } from '../repositories/ticket.repository';
import { TicketService } from './ticket.service';
import { TicketAclService } from './ticket-acl.service';

describe('TicketService', () => {
  let service: TicketService;
  let mockedRepository: any;
  const mockedLogger = { setContext: jest.fn(), log: jest.fn() };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: TicketRepository,
          useValue: { save: jest.fn(), getById: jest.fn() },
        },
        { provide: UserService, useValue: {} },
        { provide: CompanyService, useValue: {} },
        { provide: TicketAclService, useValue: new TicketAclService() },
        { provide: AppLogger, useValue: mockedLogger },
      ],
    }).compile();

    service = moduleRef.get<TicketService>(TicketService);
    mockedRepository = moduleRef.get(TicketRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const ctx = new RequestContext();

  function ownTicket() {
    return { id: 1, status: TicketStatus.OPEN, author: { id: 1 } } as SupportTicket;
  }

  describe('updateTicket status rules', () => {
    it('should let the author close their own ticket', async () => {
      ctx.user = { id: 1, roles: [ROLE.ARISE_MEMBER], username: 'member' };
      const input: UpdateTicketInput = { status: TicketStatus.RESOLVED };
      mockedRepository.getById.mockResolvedValue(ownTicket());
      mockedRepository.save.mockImplementation(async (t: SupportTicket) => t);

      await service.updateTicket(ctx, 1, input);
      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TicketStatus.RESOLVED }),
      );
    });

    it('should let the author reopen their own ticket', async () => {
      ctx.user = { id: 1, roles: [ROLE.ARISE_MEMBER], username: 'member' };
      const input: UpdateTicketInput = { status: TicketStatus.OPEN };
      mockedRepository.getById.mockResolvedValue({
        ...ownTicket(),
        status: TicketStatus.RESOLVED,
      });
      mockedRepository.save.mockImplementation(async (t: SupportTicket) => t);

      await service.updateTicket(ctx, 1, input);
      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TicketStatus.OPEN }),
      );
    });

    it('should drop other statuses set by the author', async () => {
      ctx.user = { id: 1, roles: [ROLE.ARISE_MEMBER], username: 'member' };
      const input: UpdateTicketInput = { status: TicketStatus.IN_PROGRESS };
      mockedRepository.getById.mockResolvedValue(ownTicket());
      mockedRepository.save.mockImplementation(async (t: SupportTicket) => t);

      await service.updateTicket(ctx, 1, input);
      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TicketStatus.OPEN }),
      );
    });

    it('should let admins set any status', async () => {
      ctx.user = { id: 9, roles: [ROLE.ARISE_IT_ADMIN], username: 'admin' };
      const input: UpdateTicketInput = { status: TicketStatus.IN_PROGRESS };
      mockedRepository.getById.mockResolvedValue(ownTicket());
      mockedRepository.save.mockImplementation(async (t: SupportTicket) => t);

      await service.updateTicket(ctx, 1, input);
      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TicketStatus.IN_PROGRESS }),
      );
    });

    it('should reject updates by non-authors', async () => {
      ctx.user = { id: 2, roles: [ROLE.ARISE_MEMBER], username: 'other' };
      mockedRepository.getById.mockResolvedValue(ownTicket());

      await expect(
        service.updateTicket(ctx, 1, { description: 'hijack' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mockedRepository.save).not.toHaveBeenCalled();
    });
  });
});
