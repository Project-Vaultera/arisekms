import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Activity } from '../entities/activity.entity';

@Injectable()
export class ActivityRepository extends Repository<Activity> {
  constructor(private dataSource: DataSource) {
    super(Activity, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<Activity> {
    const activity = await this.findOne({ where: { id }, relations: { company: true } });
    if (!activity) {
      throw new NotFoundException();
    }
    return activity;
  }
}
