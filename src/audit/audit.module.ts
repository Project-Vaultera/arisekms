import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '../shared/shared.module';
import { AuditController } from './controllers/audit.controller';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './services/audit.service';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
