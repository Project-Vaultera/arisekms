import { Injectable } from '@nestjs/common';

import { ROLE } from '../../auth/constants/role.constant';
import { BaseAclService } from '../../shared/acl/acl.service';
import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { Article } from '../entities/article.entity';

@Injectable()
export class ArticleAclService extends BaseAclService<Article> {
  constructor() {
    super();
    this.canDo(ROLE.ARISE_IT_ADMIN, [Action.Manage]);
    this.canDo(ROLE.ARISE_SECRETARIAT, [Action.Manage]);
    this.canDo(ROLE.ARISE_MEMBER, [Action.Create, Action.List, Action.Read]);
    this.canDo(ROLE.ARISE_MEMBER, [Action.Update, Action.Delete], this.isArticleAuthor);
    this.canDo(ROLE.ARISE_DATA_ANALYST, [Action.List, Action.Read]);
  }

  isArticleAuthor(article: Article, user: Actor): boolean {
    return article.author.id === user.id;
  }
}
