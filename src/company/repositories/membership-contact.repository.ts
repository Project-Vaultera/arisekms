import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { MembershipContact } from '../entities/membership-contact.entity';

@Injectable()
export class MembershipContactRepository extends Repository<MembershipContact> {
  constructor(private dataSource: DataSource) {
    super(MembershipContact, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<MembershipContact> {
    const contact = await this.findOne({ where: { id }, relations: { company: true } });
    if (!contact) {
      throw new NotFoundException();
    }
    return contact;
  }
}
