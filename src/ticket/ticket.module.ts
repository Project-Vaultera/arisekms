import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthStrategy } from '../auth/strategies/jwt-auth.strategy';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';
import { TicketController } from './controllers/ticket.controller';
import { SupportTicket } from './entities/support-ticket.entity';
import { TicketRepository } from './repositories/ticket.repository';
import { TicketService } from './services/ticket.service';
import { TicketAclService } from './services/ticket-acl.service';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([SupportTicket]), UserModule],
  providers: [TicketService, JwtAuthStrategy, TicketAclService, TicketRepository],
  controllers: [TicketController],
  exports: [TicketService],
})
export class TicketModule {}
