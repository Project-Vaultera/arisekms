import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module';
import { JwtAuthStrategy } from '../auth/strategies/jwt-auth.strategy';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';
import { KnowledgeController } from './controllers/knowledge.controller';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { KnowledgeRepository } from './repositories/knowledge.repository';
import { KnowledgeService } from './services/knowledge.service';
import { KnowledgeAclService } from './services/knowledge-acl.service';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([KnowledgeDocument]), UserModule, AuditModule],
  providers: [KnowledgeService, JwtAuthStrategy, KnowledgeAclService, KnowledgeRepository],
  controllers: [KnowledgeController],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
