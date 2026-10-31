import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { KnowledgeDocument } from '../entities/knowledge-document.entity';

@Injectable()
export class KnowledgeRepository extends Repository<KnowledgeDocument> {
  constructor(private dataSource: DataSource) {
    super(KnowledgeDocument, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<KnowledgeDocument> {
    const doc = await this.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException();
    }

    return doc;
  }
}
