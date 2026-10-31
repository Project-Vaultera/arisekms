import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { MembershipDocument } from '../entities/membership-document.entity';

@Injectable()
export class MembershipDocumentRepository extends Repository<MembershipDocument> {
  constructor(private dataSource: DataSource) {
    super(MembershipDocument, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<MembershipDocument> {
    const doc = await this.findOne({ where: { id }, relations: { company: true } });
    if (!doc) {
      throw new NotFoundException();
    }
    return doc;
  }
}
