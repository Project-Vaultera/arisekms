import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { SupportTicket } from '../entities/support-ticket.entity';

@Injectable()
export class TicketRepository extends Repository<SupportTicket> {
  constructor(private dataSource: DataSource) {
    super(SupportTicket, dataSource.createEntityManager());
  }

  async getById(id: number): Promise<SupportTicket> {
    const ticket = await this.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException();
    }

    return ticket;
  }
}
