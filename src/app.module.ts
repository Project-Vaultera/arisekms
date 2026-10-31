import { Module } from '@nestjs/common';

import { ActivityModule } from './activity/activity.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticleModule } from './article/article.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CertificateModule } from './certificate/certificate.module';
import { CompanyModule } from './company/company.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { ReportModule } from './report/report.module';
import { SharedModule } from './shared/shared.module';
import { TicketModule } from './ticket/ticket.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    SharedModule,
    UserModule,
    AuthModule,
    AuditModule,
    ArticleModule,
    ReportModule,
    KnowledgeModule,
    TicketModule,
    CertificateModule,
    CompanyModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
