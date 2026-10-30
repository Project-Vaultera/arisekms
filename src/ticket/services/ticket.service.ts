import { Injectable, UnauthorizedException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { In } from 'typeorm';

import { ROLE } from '../../auth/constants/role.constant';
import { CompanyService } from '../../company/services/company.service';
import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import { CreateTicketInput, UpdateTicketInput } from '../dtos/ticket-input.dto';
import { TicketOutput } from '../dtos/ticket-output.dto';
import { SupportTicket } from '../entities/support-ticket.entity';
import { TicketRepository } from '../repositories/ticket.repository';
import { TicketAclService } from './ticket-acl.service';

@Injectable()
export class TicketService {
  constructor(
    private repository: TicketRepository,
    private userService: UserService,
    private companyService: CompanyService,
    private aclService: TicketAclService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(TicketService.name);
  }

  async createTicket(ctx: RequestContext, input: CreateTicketInput): Promise<TicketOutput> {
    this.logger.log(ctx, `${this.createTicket.name} was called`);

    const actor: Actor = ctx.user!;
    const ticket = plainToClass(SupportTicket, input);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Create, ticket);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.getUserById(ctx, actor.id);
    ticket.author = plainToClass(User, user);

    this.logger.log(ctx, `calling ${TicketRepository.name}.save`);
    const saved = await this.repository.save(ticket);

    return plainToClass(TicketOutput, saved, { excludeExtraneousValues: true });
  }

  async getTickets(
    ctx: RequestContext,
    limit: number,
    offset: number,
  ): Promise<{ tickets: TicketOutput[]; count: number }> {
    this.logger.log(ctx, `${this.getTickets.name} was called`);

    const actor: Actor = ctx.user!;
    const isAllowed = this.aclService.forActor(actor).canDoAction(Action.List);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Company isolation: members see rows from users sharing ≥1 company
    // (self included); admins see everything.
    const memberIds = await this.companyService.getCompanyMemberUserIds(actor);
    const where = memberIds ? { author: { id: In(memberIds) } } : {};

    this.logger.log(ctx, `calling ${TicketRepository.name}.findAndCount`);
    const [tickets, count] = await this.repository.findAndCount({
      where,
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });

    return {
      tickets: plainToClass(TicketOutput, tickets, { excludeExtraneousValues: true }),
      count,
    };
  }

  async getTicketById(ctx: RequestContext, id: number): Promise<TicketOutput> {
    this.logger.log(ctx, `${this.getTicketById.name} was called`);

    const actor: Actor = ctx.user!;
    const ticket = await this.repository.getById(id);
    await this.assertCompanyAccess(actor, ticket.author.id);

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Read, ticket);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    return plainToClass(TicketOutput, ticket, { excludeExtraneousValues: true });
  }

  async updateTicket(
    ctx: RequestContext,
    ticketId: number,
    input: UpdateTicketInput,
  ): Promise<TicketOutput> {
    this.logger.log(ctx, `${this.updateTicket.name} was called`);

    const ticket = await this.repository.getById(ticketId);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Update, ticket);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    // Only admins triage; members' status input is dropped.
    const patch: UpdateTicketInput = { ...input };
    if (!actor.roles?.includes(ROLE.ADMIN)) {
      delete patch.status;
    }
    const updated: SupportTicket = { ...ticket, ...patch };

    this.logger.log(ctx, `calling ${TicketRepository.name}.save`);
    const saved = await this.repository.save(updated);

    return plainToClass(TicketOutput, saved, { excludeExtraneousValues: true });
  }

  async deleteTicket(ctx: RequestContext, id: number): Promise<void> {
    this.logger.log(ctx, `${this.deleteTicket.name} was called`);

    const ticket = await this.repository.getById(id);
    const actor: Actor = ctx.user!;

    const isAllowed = this.aclService
      .forActor(actor)
      .canDoAction(Action.Delete, ticket);
    if (!isAllowed) {
      throw new UnauthorizedException();
    }

    this.logger.log(ctx, `calling ${TicketRepository.name}.remove`);
    await this.repository.remove(ticket);
  }

  private async assertCompanyAccess(actor: Actor, authorId: number): Promise<void> {
    const memberIds = await this.companyService.getCompanyMemberUserIds(actor);
    if (memberIds && !memberIds.includes(authorId)) {
      throw new UnauthorizedException();
    }
  }
}
