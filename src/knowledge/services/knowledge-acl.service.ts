import { Injectable } from '@nestjs/common';

import { ROLE } from '../../auth/constants/role.constant';
import { BaseAclService } from '../../shared/acl/acl.service';
import { Action } from '../../shared/acl/action.constant';
import { KnowledgeDocument } from '../entities/knowledge-document.entity';

@Injectable()
export class KnowledgeAclService extends BaseAclService<KnowledgeDocument> {
  constructor() {
    super();
    this.canDo(ROLE.ARISE_IT_ADMIN, [Action.Manage]);
    this.canDo(ROLE.ARISE_SECRETARIAT, [Action.Manage]);
    this.canDo(ROLE.ARISE_DATA_ANALYST, [Action.List, Action.Read]);
    this.canDo(ROLE.ARISE_MEMBER, [Action.List, Action.Read]);
  }
}
