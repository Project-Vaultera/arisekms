import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { Activity } from './activity/entities/activity.entity';
import { MembershipStatus } from './company/entities/company.entity';
import { AppModule } from './app.module';
import { ROLE } from './auth/constants/role.constant';
import { ActivityService } from './activity/services/activity.service';
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
  planDemoCompanyDetails,
  planDemoActivityDetails,
  planDemoKnowledge,
  planDemoReports,
  planDemoUserDetails,
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

    const hadMarker = await users.findByUsername(ctx, MARKER_USERNAME);
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

    // Users converge by username: only missing demo accounts are created
    // (with their planned active/inactive flag). Join dates are backdated for
    // every demo user so the directory timeline has shape; existing disabled
    // flags are left alone to respect admin toggles.
    const userDetails = new Map(planDemoUserDetails().map((d) => [d.username, d]));
    const members: Array<{ id: number; username: string; roles: string[]; name: string }> = [];
    let createdUsers = 0;
    for (const m of DEMO_USERS) {
      let found = await users.findByUsername(ctx, m.username);
      if (!found) {
        found = await users.createUser(ctx, {
          name: m.name,
          username: m.username,
          password: DEMO_PASSWORD,
          roles: [ROLE.USER],
          isAccountDisabled: userDetails.get(m.username)?.disabled ?? m.disabled,
          email: `${m.username}@example.com`,
        });
        createdUsers += 1;
      }
      members.push({ id: found.id, username: found.username, roles: found.roles, name: found.name });
      const detail = userDetails.get(m.username);
      if (detail) {
        await dataSource.getRepository(User).update(found.id, { createdAt: daysAgoToDate(detail.daysAgo) });
      }
    }
    if (createdUsers > 0) {
      console.log(`Seeded ${createdUsers} new demo users (password: ${DEMO_PASSWORD}).`);
    }

    if (!hadMarker) {
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
      `Seeded ${reportRows.length} reports, ${certRows.length} certificates, ${knowledgeRows.length} knowledge docs. Users total: ${userCount}.`,
    );
    } // end fresh-content branch

    // Company seeding converges by name, so re-runs remap existing DBs too:
    // details (sector/region/joined date) are backfilled for every seed
    // company so the membership dashboards always have data to show.
    const companiesSvc = app.get(CompanyService);
    {
      const adminCtx = actorCtx({ id: admin.id, username: admin.username, roles: admin.roles });
      const details = new Map(planDemoCompanyDetails().map((d) => [d.name, d]));
      for (const [i, entry] of DEMO_COMPANY_MEMBERS.entries()) {
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
        const detail = details.get(entry.name);
        if (detail) {
          await dataSource.getRepository(Company).update(company.id, {
            sector: detail.sector,
            region: detail.region,
            createdAt: daysAgoToDate(detail.daysAgo),
            // Every 3rd seed company reads as approved (Active in the
            // directory); the rest stay as-is so manual states survive.
            ...(i % 3 === 0 ? { status: MembershipStatus.APPROVED } : {}),
          });
        }
      }
      console.log(`Seeded ${DEMO_COMPANY_MEMBERS.length} demo companies with sector/region/joined-date details.`);
    }

    // Activities converge by title so re-runs backfill without duplicating.
    const activitySvc = app.get(ActivityService);
    const activityRows = planDemoActivityDetails();
    let createdActivities = 0;
    for (const row of activityRows) {
      const author = await users.findByUsername(ctx, row.authorUsername);
      const company = await dataSource.getRepository(Company).findOne({ where: { name: row.companyName } });
      if (!author || !company) {
        console.log(`Skipping activity seed with no author/company: ${row.title}`);
        continue;
      }
      let activity = await dataSource.getRepository(Activity).findOne({ where: { title: row.title } });
      if (!activity) {
        const saved = await activitySvc.createActivity(
          actorCtx({ id: author.id, username: author.username, roles: author.roles }),
          {
            title: row.title,
            activityType: row.activityType,
            targetAudience: row.targetAudience,
            happenedAt: daysAgoToDate(row.daysAgo).toISOString().slice(0, 10),
            ...(row.youthCount != null ? { youthCount: row.youthCount } : {}),
            ...(row.trainedCount != null ? { trainedCount: row.trainedCount } : {}),
            isInternational: row.isInternational,
            notes: 'Demo seed data.',
            companyId: company.id,
          },
        );
        activity = { id: saved.id } as Activity;
        createdActivities += 1;
      }
      await dataSource.getRepository(Activity).update(activity.id, {
        status: row.status,
        happenedAt: daysAgoToDate(row.daysAgo).toISOString().slice(0, 10),
        createdAt: daysAgoToDate(row.daysAgo),
      });
    }
    console.log(`Seeded ${createdActivities} new demo activities (converged by title).`);
  } finally {
    await app.close();
  }
}
bootstrap();
