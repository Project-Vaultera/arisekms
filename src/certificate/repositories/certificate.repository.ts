import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Certificate } from '../entities/certificate.entity';

@Injectable()
export class CertificateRepository extends Repository<Certificate> {
  constructor(private dataSource: DataSource) {
    super(Certificate, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<Certificate> {
    const certificate = await this.findOne({ where: { id } });
    if (!certificate) {
      throw new NotFoundException();
    }

    return certificate;
  }
}
