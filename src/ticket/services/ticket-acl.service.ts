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
    this.canDo(ROLE.ARISE_IT_ADMIN, [Action.Manage]);
    this.canDo(ROLE.ARISE_SECRETARIAT, [Action.Manage]);
    this.canDo(ROLE.ARISE_MEMBER, [Action.Create, Action.List, Action.Read]);
    this.canDo(ROLE.ARISE_MEMBER, [Action.Update, Action.Delete], this.isAuthor);
    this.canDo(ROLE.ARISE_DATA_ANALYST, [Action.List, Action.Read]);
  }

  isAuthor(ticket: SupportTicket, user: Actor): boolean {
    return ticket.author.id === user.id;
  }
}
