import { Injectable } from '@nestjs/common';

import { ROLE } from '../../auth/constants/role.constant';
import { BaseAclService } from '../../shared/acl/acl.service';
import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { KnowledgeDocument, KnowledgeStatus } from '../entities/knowledge-document.entity';

function isOwn(doc: KnowledgeDocument, actor: Actor): boolean {
  return Number(doc.author?.id) === Number(actor.id);
}

function isPending(doc: KnowledgeDocument): boolean {
  return doc.status === KnowledgeStatus.SUBMITTED || doc.status === KnowledgeStatus.REJECTED;
}

@Injectable()
export class KnowledgeAclService extends BaseAclService<KnowledgeDocument> {
  constructor() {
    super();
    this.canDo(ROLE.ARISE_IT_ADMIN, [Action.Manage]);
    this.canDo(ROLE.ARISE_SECRETARIAT, [Action.Manage]);
    // Analysts read published content only — submitted drafts stay out of analytics.
    this.canDo(ROLE.ARISE_DATA_ANALYST, [Action.List]);
    this.canDo(ROLE.ARISE_DATA_ANALYST, [Action.Read], (doc) => doc.status === KnowledgeStatus.APPROVED);
    // Members upload (own docs land as submitted), read published + own docs,
    // and edit/delete only their own pending (submitted/rejected) docs.
    this.canDo(ROLE.ARISE_MEMBER, [Action.List, Action.Create]);
    this.canDo(
      ROLE.ARISE_MEMBER,
      [Action.Read],
      (doc, actor) => isOwn(doc, actor) || doc.status === KnowledgeStatus.APPROVED,
    );
    this.canDo(
      ROLE.ARISE_MEMBER,
      [Action.Update, Action.Delete],
      (doc, actor) => isOwn(doc, actor) && isPending(doc),
    );
  }
}
