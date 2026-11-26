import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<User> {
    const user = await this.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }

  // Case-insensitive: mail clients mangle case, so the address as typed must
  // still find its account.
  async findByEmail(email: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .where('lower(user.email) = lower(:email)', { email })
      .getOne();
  }
}
