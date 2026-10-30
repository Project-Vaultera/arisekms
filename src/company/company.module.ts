import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthStrategy } from '../auth/strategies/jwt-auth.strategy';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';
import { CompanyController } from './controllers/company.controller';
import { Company } from './entities/company.entity';
import { CompanyRepository } from './repositories/company.repository';
import { CompanyService } from './services/company.service';
import { CompanyAclService } from './services/company-acl.service';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Company]), UserModule],
  providers: [CompanyService, JwtAuthStrategy, CompanyAclService, CompanyRepository],
  controllers: [CompanyController],
  exports: [CompanyService],
})
export class CompanyModule {}
