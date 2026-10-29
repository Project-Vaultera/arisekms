import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthStrategy } from '../auth/strategies/jwt-auth.strategy';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';
import { CertificateController } from './controllers/certificate.controller';
import { Certificate } from './entities/certificate.entity';
import { CertificateRepository } from './repositories/certificate.repository';
import { CertificateService } from './services/certificate.service';
import { CertificateAclService } from './services/certificate-acl.service';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Certificate]), UserModule],
  providers: [CertificateService, JwtAuthStrategy, CertificateAclService, CertificateRepository],
  controllers: [CertificateController],
  exports: [CertificateService],
})
export class CertificateModule {}
