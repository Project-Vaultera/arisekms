import { Injectable } from '@nestjs/common';

import { BaseAclService } from '../../shared/acl/acl.service';
import { User } from '../entities/user.entity';
import { ROLE } from './../../auth/constants/role.constant';
import { Action } from './../../shared/acl/action.constant';
import { Actor } from './../../shared/acl/actor.constant';

@Injectable()
export class UserAclService extends BaseAclService<User> {
  constructor() {
    super();
    // IT admin can do all actions; secretariat can list for member vetting.
    this.canDo(ROLE.ARISE_IT_ADMIN, [Action.Manage]);
    this.canDo(ROLE.ARISE_SECRETARIAT, [Action.Read]);
    //user can read himself or any other user
    this.canDo(ROLE.ARISE_MEMBER, [Action.Read]);
    // user can only update himself
    this.canDo(ROLE.ARISE_MEMBER, [Action.Update], this.isUserItself);
  }

  isUserItself(resource: User, actor: Actor): boolean {
    return resource.id === actor.id;
  }
}
