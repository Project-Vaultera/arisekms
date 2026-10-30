import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from './app.module';
import { ROLE } from './auth/constants/role.constant';
import { Certificate } from './certificate/entities/certificate.entity';
import { CertificateService } from './certificate/services/certificate.service';
import { Company } from './company/entities/company.entity';
import { CompanyService } from './company/services/company.service';
import { KnowledgeDocument } from './knowledge/entities/knowledge-document.entity';
import { KnowledgeService } from './knowledge/services/knowledge.service';
import { Report } from './report/entities/report.entity';
import { ReportService } from './report/services/report.service';
import { RequestContext } from './shared/request-context/request-context.dto';
import {
  daysAgoToDate,
  DEMO_COMPANY_MEMBERS,
  DEMO_COURSES,
  DEMO_PASSWORD,
  DEMO_USERS,
  planDemoCertificates,
  planDemoKnowledge,
  planDemoReports,
} from './shared/seeds/demo-content';
import { User } from './user/entities/user.entity';
import { UserService } from './user/services/user.service';

const MARKER_USERNAME = DEMO_USERS[0].username;

// Minimal valid one-page PDF generated in code (no binary fixtures).
function demoPdf(title: string): Buffer {
  const safe = title.replace(/[()\\]/g, '');
  return Buffer.from(
    [
      '%PDF-1.4',
      '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<<>>>>endobj',
      `4 0 obj<</Length 58>>stream`,
      `BT /F1 14 Tf 72 720 Td (${safe.slice(0, 60)}) Tj ET`,
      'endstream',
      'endobj',
      'trailer<</Root 1 0 R>>',
    ].join('\n'),
  );
}

function demoFile(name: string): Express.Multer.File {
  const buffer = demoPdf(name);
  return {
    buffer,
    originalname: `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)}.pdf`,
    mimetype: 'application/pdf',
    size: buffer.length,
  } as Express.Multer.File;
}

function actorCtx(user: { id: number; username: string; roles: string[] }): RequestContext {
  const ctx = new RequestContext();
  ctx.requestID = 'seed-demo';
  ctx.user = { id: user.id, username: user.username, roles: user.roles as ROLE[] };
  return ctx;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const config = app.get(ConfigService);
    if (config.get<string>('env') === 'production') {
      console.error('seed:demo refuses to run with APP_ENV=production.');
      process.exitCode = 1;
      return;
    }

    const users = app.get(UserService);
    const reports = app.get(ReportService);
    const certificates = app.get(CertificateService);
    const knowledge = app.get(KnowledgeService);
    const dataSource = app.get(DataSource);
    const ctx = new RequestContext();
    ctx.requestID = 'seed-demo';

    if (await users.findByUsername(ctx, MARKER_USERNAME)) {
      console.log('Demo users already seeded (demo.member.1 exists). Skipping user/report seeding.');
    } else {
    let admin = await users.findByUsername(ctx, 'it-admin');
    if (!admin) {
      const fallback = config.get<string>('defaultAdminUserPassword') ?? 'AdminPass123!';
      admin = await users.createUser(ctx, {
        name: 'IT Admin User',
        username: 'it-admin',
        password: fallback,
        roles: [ROLE.ADMIN],
        isAccountDisabled: false,
        email: 'it-admin@example.com',
      });
      console.log('Created fallback it-admin account.');
    }
    const adminCtx = actorCtx({ id: admin.id, username: admin.username, roles: admin.roles });

    const members: Array<{ id: number; username: string; roles: string[]; name: string }> = [];
    for (const m of DEMO_USERS) {
      const created = await users.createUser(ctx, {
        name: m.name,
        username: m.username,
        password: DEMO_PASSWORD,
        roles: [ROLE.USER],
        isAccountDisabled: m.disabled,
        email: `${m.username}@example.com`,
      });
      members.push({ id: created.id, username: created.username, roles: created.roles, name: m.name });
    }

    const reportRows = planDemoReports();
    for (const row of reportRows) {
      const author = members[row.authorIndex];
      const saved = await reports.createReport(actorCtx(author), { category: row.category }, demoFile(row.category));
      await dataSource
        .getRepository(Report)
        .update(saved.id, { status: row.status, createdAt: daysAgoToDate(row.daysAgo) });
    }

    const certRows = planDemoCertificates();
    for (const [i, row] of certRows.entries()) {
      const author = members[row.authorIndex];
      const course = DEMO_COURSES[row.courseIndex];
      const saved = await certificates.createCertificate(actorCtx(author), {
        memberName: author.name,
        course,
        issuer: 'IBM SkillsBuild',
        dateIssued: daysAgoToDate(row.daysAgo).toISOString().slice(0, 10),
        credentialId: `DEMO-${String(i + 1).padStart(4, '0')}`,
      });
      await dataSource
        .getRepository(Certificate)
        .update(saved.id, { status: row.status, createdAt: daysAgoToDate(row.daysAgo) });
    }

    const knowledgeRows = planDemoKnowledge();
    for (const row of knowledgeRows) {
      const saved = await knowledge.createDocument(
        adminCtx,
        { title: row.title, description: `${row.title} (demo seed data).`, category: row.category },
        demoFile(row.title),
      );
      await dataSource.getRepository(KnowledgeDocument).update(saved.id, {
        createdAt: daysAgoToDate(row.daysAgo),
      });
    }

    const userCount = await dataSource.getRepository(User).count();
    console.log(
      `Seeded ${members.length} demo users (password: ${DEMO_PASSWORD}), ${reportRows.length} reports, ${certRows.length} certificates, ${knowledgeRows.length} knowledge docs. Users total: ${userCount}.`,
    );
    } // end fresh-seed branch

    // Company seeding converges by name, so re-runs remap existing DBs too:
    // 4 primary companies hold exclusive member pairs, the other 16 hold a
    // single floater each.
    const companiesSvc = app.get(CompanyService);
    const admin = await users.findByUsername(ctx, 'it-admin');
    if (!admin) {
      console.log('Skipping company seeding: no it-admin account found.');
    } else {
      const adminCtx = actorCtx({ id: admin.id, username: admin.username, roles: admin.roles });
      for (const entry of DEMO_COMPANY_MEMBERS) {
        let company = await dataSource.getRepository(Company).findOne({ where: { name: entry.name } });
        if (!company) {
          const created = await companiesSvc.createCompany(adminCtx, { name: entry.name });
          company = { id: created.id } as Company;
        }
        const userIds = [];
        for (const username of entry.members) {
          const found = await users.findByUsername(ctx, username);
          if (found) userIds.push(found.id);
        }
        await companiesSvc.setMembers(adminCtx, company.id, userIds);
      }
      console.log(
        `Seeded ${DEMO_COMPANY_MEMBERS.length} demo companies (4 primary pairs + 16 single-member).`,
      );
    }
  } finally {
    await app.close();
  }
}
bootstrap();
