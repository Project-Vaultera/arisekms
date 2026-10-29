import { Injectable } from '@nestjs/common';

import { ROLE } from '../../auth/constants/role.constant';
import { BaseAclService } from '../../shared/acl/acl.service';
import { Action } from '../../shared/acl/action.constant';
import { Actor } from '../../shared/acl/actor.constant';
import { Certificate } from '../entities/certificate.entity';

@Injectable()
export class CertificateAclService extends BaseAclService<Certificate> {
  constructor() {
    super();
    this.canDo(ROLE.ADMIN, [Action.Manage]);
    this.canDo(ROLE.USER, [Action.Create, Action.List]);
    this.canDo(ROLE.USER, [Action.Read], this.isSubmitter);
  }

  isSubmitter(certificate: Certificate, user: Actor): boolean {
    return certificate.submittedBy.id === user.id;
  }
}
