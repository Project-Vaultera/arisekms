import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Company } from '../entities/company.entity';

@Injectable()
export class CompanyRepository extends Repository<Company> {
  constructor(private dataSource: DataSource) {
    super(Company, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<Company> {
    const company = await this.findOne({
      where: { id },
      relations: { members: true },
    });
    if (!company) {
      throw new NotFoundException();
    }

    return company;
  }
}
