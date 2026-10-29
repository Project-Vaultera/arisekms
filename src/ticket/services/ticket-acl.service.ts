import { Injectable } from '@nestjs/common';

import { ROLE } from '../../auth/constants/role.constant';
import { BaseAclService } from '../../shared/acl/acl.service';
import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { SupportTicket } from '../entities/support-ticket.entity';

@Injectable()
export class TicketAclService extends BaseAclService<SupportTicket> {
  constructor() {
    super();
    this.canDo(ROLE.ADMIN, [Action.Manage]);
    this.canDo(ROLE.USER, [Action.Create, Action.List]);
    this.canDo(ROLE.USER, [Action.Read, Action.Update, Action.Delete], this.isAuthor);
  }

  isAuthor(ticket: SupportTicket, user: Actor): boolean {
    return ticket.author.id === user.id;
  }
}
