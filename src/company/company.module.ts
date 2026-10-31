import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthStrategy } from '../auth/strategies/jwt-auth.strategy';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';
import { CompanyController } from './controllers/company.controller';
import { Company } from './entities/company.entity';
import { MembershipContact } from './entities/membership-contact.entity';
import { MembershipDocument } from './entities/membership-document.entity';
import { CompanyRepository } from './repositories/company.repository';
import { MembershipContactRepository } from './repositories/membership-contact.repository';
import { MembershipDocumentRepository } from './repositories/membership-document.repository';
import { CompanyService } from './services/company.service';
import { CompanyAclService } from './services/company-acl.service';
import { MembershipService } from './services/membership.service';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Company, MembershipContact, MembershipDocument]), UserModule],
  providers: [CompanyService, JwtAuthStrategy, CompanyAclService, CompanyRepository, MembershipService, MembershipContactRepository, MembershipDocumentRepository],
  controllers: [CompanyController],
  exports: [CompanyService, MembershipService],
})
export class CompanyModule {}
