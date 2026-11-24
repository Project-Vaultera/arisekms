import { ConfigService } from '@nestjs/config';
import { NestApplicationContext, NestFactory } from '@nestjs/core';
import { DataSource, Repository } from 'typeorm';

import { Activity } from './activity/entities/activity.entity';
import { ActivityService } from './activity/services/activity.service';
import { AppModule } from './app.module';
import { ROLE } from './auth/constants/role.constant';
import { Certificate } from './certificate/entities/certificate.entity';
import { CertificateService } from './certificate/services/certificate.service';
import { MembershipStatus } from './company/entities/company.entity';
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
  planDemoActivityDetails,
  planDemoCertificates,
  planDemoCompanyDetails,
  planDemoKnowledge,
  planDemoReports,
  planDemoTickets,
  planDemoUserDetails,
} from './shared/seeds/demo-content';
import {
  assertSeedingAllowed,
  handleSeedRefusal,
  resolveSeedPassword,
} from './shared/seeds/seeding-gate';
import { SupportTicket } from './ticket/entities/support-ticket.entity';
import { TicketService } from './ticket/services/ticket.service';
import { User } from './user/entities/user.entity';
import { UserService } from './user/services/user.service';


const SEED_NAME = 'seed:demo';
const PASSWORD_ENV = 'SEED_DEMO_PASSWORD';
// DEMO_PASSWORD is the development default only. Production requires
// SEED_DEMO_PASSWORD — see docs/specs/production-seeding.md.

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

// A calendar day, so the marker survives a UTC-midnight rollover on a run.
function isToday(date: Date): boolean {
  return new Date().toISOString().slice(0, 10) === date.toISOString().slice(0, 10);
}

function actorCtx(user: { id: number; username: string; roles: string[] }): RequestContext {
  const ctx = new RequestContext();
  ctx.requestID = 'seed-demo';
  ctx.user = { id: user.id, username: user.username, roles: user.roles as ROLE[] };
  return ctx;
}

async function bootstrap() {
  // Instance type, not the bare context interface: SeedRoles-style callers pass
  // the concrete context around.
  const app = (await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })) as unknown as NestApplicationContext;
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

// The first demo company doubles as the content marker.
const markerName = DEMO_COMPANY_MEMBERS[0].name;

async function run(app: NestApplicationContext) {
  try {
    assertSeedingAllowed(SEED_NAME, PASSWORD_ENV);
  } catch (error) {
    if (handleSeedRefusal(error)) {
      return;
    }
    throw error;
  }
  const demoPassword = resolveSeedPassword(PASSWORD_ENV, DEMO_PASSWORD);
  try {

    const config = app.get(ConfigService);
    const users = app.get(UserService);
      const reports = app.get(ReportService);
      const certificates = app.get(CertificateService);
      const knowledge = app.get(KnowledgeService);
      const dataSource = app.get(DataSource);
      const companyRepository = dataSource.getRepository(Company);
      const ctx = new RequestContext();
      ctx.requestID = 'seed-demo';

      let admin = await users.findByUsername(ctx, 'it-admin');
      if (!admin) {
        const fallback = config.get<string>('defaultAdminUserPassword') ?? 'AdminPass123!';
        admin = await users.createUser(ctx, {
          name: 'IT Admin User',
          username: 'it-admin',
          password: fallback,
          roles: [ROLE.ARISE_IT_ADMIN],
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
            password: demoPassword,
            roles: [ROLE.ARISE_MEMBER],
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
        // Never print the password itself: container logs outlive the run and are
        // readable by anyone with host access.
        const source = (process.env[PASSWORD_ENV] ?? '').trim()
          ? PASSWORD_ENV
          : 'development default';
        console.log(
          `Seeded ${createdUsers} new demo users (password source: ${source}).`,
        );
      }

      const markerCompany = await companyRepository.findOne({
        where: { name: DEMO_COMPANY_MEMBERS[0].name },
      });
      if (!markerCompany) {
        throw new Error(
          `Missing marker company "${DEMO_COMPANY_MEMBERS[0].name}".`,
        );
      }
      // Companies go first: reports and activities are member-authored and the
      // services reject an author whose company is not approved yet.
      await seedCompaniesAndActivities(app, ctx, {
        users,
        dataSource,
        companyRepository,
        adminCtx,
      });

      // Content is keyed off the marker company's join date: stamping it "now"
      // is the only way it reads as today, because the planner never yields
      // today (`daysAgoToDate` floors at 5 days). Read only after the companies
      // block has rewritten it — and gate on that, not on the first demo *user*
      // existing, which a failed attempt already satisfies.
      {
        const markerAfter = await companyRepository.findOne({
          where: { id: markerCompany.id },
        });
        if (markerAfter && isToday(markerAfter.createdAt)) {
          console.log(
            'Demo content already seeded; skipping reports, certificates and knowledge.',
          );
        } else {
          try {
            await seedContent({
              dataSource,
              reports,
              certificates,
              knowledge,
              adminCtx,
              members,
            });
          } finally {
            // Stamp only once every family is written, so an aborted run retries
            // the content instead of closing the gate over a half-finished DB.
            await companyRepository.update(markerCompany.id, {
              createdAt: new Date(),
            });
          }
        }
      }
  } catch (error) {
    // The gate throws before any write, so a refusal is not a crash.
    if (!handleSeedRefusal(error)) {
      throw error;
    }
  }
}

interface ContentContext {
  dataSource: DataSource;
  reports: ReportService;
  certificates: CertificateService;
  knowledge: KnowledgeService;
  adminCtx: RequestContext;
  members: Array<{ id: number; username: string; roles: string[]; name: string }>;
}

async function seedContent(c: ContentContext) {
  const { dataSource, reports, certificates, knowledge, adminCtx, members } = c;
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
}

async function seedCompaniesAndActivities(
  app: NestApplicationContext,
  ctx: RequestContext,
  c: {
    users: UserService;
    dataSource: DataSource;
    companyRepository: Repository<Company>;
    adminCtx: RequestContext;
  },
) {
  const { users, dataSource, companyRepository, adminCtx } = c;
  const companiesSvc = app.get(CompanyService);
  const details = new Map(planDemoCompanyDetails().map((d) => [d.name, d]));
  for (const [i, entry] of DEMO_COMPANY_MEMBERS.entries()) {
    let company = await companyRepository.findOne({ where: { name: entry.name } });
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
      await companyRepository.update(company.id, {
        sector: detail.sector,
        region: detail.region,
        // The marker company's join date doubles as "content run completed", so
        // it keeps whatever date it has and is only ever set by the stamp. The
        // planner never yields today (daysAgoToDate floors at 5 days), so
        // backfilling it here would leave the gate permanently open.
        ...(entry.name === markerName
          ? {}
          : { createdAt: daysAgoToDate(detail.daysAgo) }),
        // Every 3rd seed company reads as approved (Active in the directory);
        // the rest stay as-is so manual states survive.
        ...(i % 3 === 0 ? { status: MembershipStatus.APPROVED } : {}),
      });
    }
  }
  console.log(`Seeded ${DEMO_COMPANY_MEMBERS.length} demo companies with sector/region/joined-date details.`);

  // Activities converge by title so re-runs backfill without duplicating.
  const activitySvc = app.get(ActivityService);
  const activityRows = planDemoActivityDetails();
  let createdActivities = 0;
  // Every approved seed company carries a row, so an empty set marks a broken
  // run rather than normal data variety.
  const alphaSet = new Set(activityRows.map((row) => row.companyName));
  for (const row of activityRows) {
    const author = await users.findByUsername(ctx, row.authorUsername);
    // By name, not by a membership lookup: demo members can sit in two companies
    // and the roster order decides which, so a member lookup may find an
    // unapproved one and trip the activity/certificate gate.
    const company = await companyRepository.findOne({ where: { name: row.companyName } });
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

  const gate =
    alphaSet.size > 0
      ? `${alphaSet.size} companies marked approved`
      : 'approved-company set empty';
  console.log(`Company gate: ${gate}.`);

  await seedTickets(app, ctx, { users, dataSource });
}

async function seedTickets(
  app: NestApplicationContext,
  ctx: RequestContext,
  c: { users: UserService; dataSource: DataSource },
) {
  const { users, dataSource } = c;
  const ticketSvc = app.get(TicketService);
  const ticketRows = planDemoTickets();
  let createdTickets = 0;
  for (const row of ticketRows) {
    const existing = await dataSource
      .getRepository(SupportTicket)
      .findOne({ where: { subject: row.subject } });
    if (!existing) {
      const author = await users.findByUsername(ctx, row.authorUsername);
      if (!author) {
        console.log(`Skipping ticket seed with no author: ${row.subject}`);
        continue;
      }
      const saved = await ticketSvc.createTicket(
        actorCtx({ id: author.id, username: author.username, roles: author.roles }),
        {
          subject: row.subject,
          category: row.category,
          priority: row.priority,
          description: `${row.subject} (demo seed data).`,
        },
      );
      const createdAt = daysAgoToDate(row.daysAgo);
      await dataSource.getRepository(SupportTicket).update(saved.id, {
        status: row.status,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + row.updatedLagDays * 86_400_000),
      });
      createdTickets += 1;
    } else {
      const createdAt = daysAgoToDate(row.daysAgo);
      await dataSource.getRepository(SupportTicket).update(existing.id, {
        status: row.status,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + row.updatedLagDays * 86_400_000),
      });
    }
  }
  console.log(`Seeded ${createdTickets} new demo tickets (converged by subject).`);
}

bootstrap();