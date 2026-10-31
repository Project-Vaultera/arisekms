import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Report } from '../entities/report.entity';

@Injectable()
export class ReportRepository extends Repository<Report> {
  constructor(private dataSource: DataSource) {
    super(Report, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<Report> {
    const report = await this.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException();
    }

    return report;
  }
}
