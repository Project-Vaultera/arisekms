import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthStrategy } from '../auth/strategies/jwt-auth.strategy';
import { CompanyModule } from '../company/company.module';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';
import { ReportController } from './controllers/report.controller';
import { Report } from './entities/report.entity';
import { ReportRepository } from './repositories/report.repository';
import { ReportService } from './services/report.service';
import { ReportAclService } from './services/report-acl.service';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Report]), UserModule, CompanyModule],
  providers: [ReportService, JwtAuthStrategy, ReportAclService, ReportRepository],
  controllers: [ReportController],
  exports: [ReportService],
})
export class ReportModule {}
