import { Injectable } from '@nestjs/common';

import { ROLE } from '../../auth/constants/role.constant';
import { BaseAclService } from '../../shared/acl/acl.service';
import { Action } from '../../shared/acl/action.constant';
import { Certificate } from '../entities/certificate.entity';

@Injectable()
export class CertificateAclService extends BaseAclService<Certificate> {
  constructor() {
    super();
    this.canDo(ROLE.ARISE_IT_ADMIN, [Action.Manage]);
    this.canDo(ROLE.ARISE_SECRETARIAT, [Action.Manage]);
    this.canDo(ROLE.ARISE_MEMBER, [Action.Create, Action.List, Action.Read]);
    this.canDo(ROLE.ARISE_DATA_ANALYST, [Action.List, Action.Read]);
  }
}
