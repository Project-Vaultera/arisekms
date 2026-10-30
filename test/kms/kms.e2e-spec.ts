import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { ROLE } from '../../src/auth/constants/role.constant';
import { AuthTokenOutput } from '../../src/auth/dtos/auth-token-output.dto';
import { UserOutput } from '../../src/user/dtos/user-output.dto';
import {
  closeDBAfterTest,
  createDBEntities,
  resetDBBeforeTest,
  seedAdminUser,
} from '../test-utils';

const PDF_BUFFER = Buffer.from('%PDF-1.4 mock report for e2e');

async function registerAndLogin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  username: string,
  extra: Record<string, unknown> = {},
): Promise<{ user: UserOutput; token: AuthTokenOutput }> {
  const reg = await request(server)
    .post('/auth/register')
    .send({
      name: username,
      username,
      password: 'member-pass-1',
      email: `${username}@example.com`,
      ...extra,
    })
    .expect(HttpStatus.CREATED);

  const login = await request(server)
    .post('/auth/login')
    .send({ username, password: 'member-pass-1' })
    .expect(HttpStatus.OK);

  return { user: reg.body.data, token: login.body.data };
}

describe('KMS modules (e2e)', () => {
  let app: INestApplication;
  let adminUser: UserOutput;
  let adminToken: AuthTokenOutput;
  let memberUser: UserOutput;
  let member2User: UserOutput;
  let memberToken: AuthTokenOutput;
  let member2Token: AuthTokenOutput;

  beforeAll(async () => {
    await resetDBBeforeTest();
    await createDBEntities();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    ({ adminUser, authTokenForAdmin: adminToken } = await seedAdminUser(app));
    ({ user: memberUser, token: memberToken } = await registerAndLogin(app.getHttpServer(), 'member-one'));
    ({ user: member2User, token: member2Token } = await registerAndLogin(app.getHttpServer(), 'member-two'));

    // New flow: each member gets their own approved company, preserving
    // the suite's member-vs-member isolation assumptions.
    const server = app.getHttpServer();
    for (const [name, user] of [
      ['Member One Corp', memberUser],
      ['Member Two Corp', member2User],
    ] as const) {
      const created = await request(server)
        .post('/companies')
        .set('Authorization', `Bearer ${adminToken.accessToken}`)
        .send({ name })
        .expect(HttpStatus.CREATED);
      await request(server)
        .post(`/companies/${created.body.data.id}/members`)
        .set('Authorization', `Bearer ${adminToken.accessToken}`)
        .send({ userId: user.id })
        .expect(HttpStatus.OK);
      await request(server)
        .post(`/companies/${created.body.data.id}/review`)
        .set('Authorization', `Bearer ${adminToken.accessToken}`)
        .send({ status: 'approved' })
        .expect(HttpStatus.OK);
    }
  });

  const auth = (token: AuthTokenOutput) => `Bearer ${token.accessToken}`;

  describe('Auth hardening', () => {
    it('registration strips a smuggled ADMIN role', async () => {
      const { user } = await registerAndLogin(app.getHttpServer(), 'sneaky', {
        roles: [ROLE.ADMIN],
      });
      expect(user.roles).toEqual([ROLE.USER]);
    });

    it('member GET /users/:id is forbidden (401 unauthenticated)', async () => {
      await request(app.getHttpServer()).get(`/users/${adminUser.id}`).expect(HttpStatus.UNAUTHORIZED);
    });

    it('member GET /users/:id is forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/users/${adminUser.id}`)
        .set('Authorization', auth(memberToken))
        .expect(HttpStatus.FORBIDDEN);
    });

    it('member PATCH /users/:id is forbidden', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${adminUser.id}`)
        .set('Authorization', auth(memberToken))
        .send({ name: 'Hacked' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('admin GET /users/:id still works', async () => {
      await request(app.getHttpServer())
        .get(`/users/${adminUser.id}`)
        .set('Authorization', auth(adminToken))
        .expect(HttpStatus.OK);
    });
  });

  let reportId: number;

  describe('Reports', () => {
    it('member submits a quarterly report (pdf)', async () => {
      const res = await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', auth(memberToken))
        .field('category', 'quarterly')
        .attach('file', PDF_BUFFER, 'q3-report.pdf')
        .expect(HttpStatus.CREATED);

      reportId = res.body.data.id;
      expect(res.body.data.category).toEqual('quarterly');
      expect(res.body.data.status).toEqual('submitted');
      expect(res.body.data.author.id).toBeDefined();
    });

    it('rejects a disallowed file type', async () => {
      await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', auth(memberToken))
        .field('category', 'quarterly')
        .attach('file', Buffer.from('MZ...'), 'evil.exe')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('member lists only their own reports', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports')
        .set('Authorization', auth(memberToken))
        .expect(HttpStatus.OK);
      expect(res.body.data.length).toEqual(1);
    });

    it('another member cannot read it', async () => {
      await request(app.getHttpServer())
        .get(`/reports/${reportId}`)
        .set('Authorization', auth(member2Token))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('member status edits are stripped', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/reports/${reportId}`)
        .set('Authorization', auth(memberToken))
        .send({ status: 'approved' })
        .expect(HttpStatus.OK);
      expect(res.body.data.status).toEqual('submitted');
    });

    it('admin approves the report', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/reports/${reportId}`)
        .set('Authorization', auth(adminToken))
        .send({ status: 'approved' })
        .expect(HttpStatus.OK);
      expect(res.body.data.status).toEqual('approved');
    });

    it('author downloads the file', async () => {
      await request(app.getHttpServer())
        .get(`/reports/${reportId}/file`)
        .set('Authorization', auth(memberToken))
        .expect(HttpStatus.OK)
        .expect('Content-Type', 'application/pdf');
    });
  });

  let docId: number;

  describe('Knowledge', () => {
    it('member upload is denied', async () => {
      await request(app.getHttpServer())
        .post('/knowledge')
        .set('Authorization', auth(memberToken))
        .field('title', 'Sneaky Doc')
        .field('category', 'Manual')
        .attach('file', PDF_BUFFER, 'sneaky.pdf')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('admin uploads a manual', async () => {
      const res = await request(app.getHttpServer())
        .post('/knowledge')
        .set('Authorization', auth(adminToken))
        .field('title', 'Employee Manual')
        .field('description', 'Guides and policies')
        .field('category', 'Manual')
        .attach('file', PDF_BUFFER, 'manual.pdf')
        .expect(HttpStatus.CREATED);

      docId = res.body.data.id;
      expect(res.body.data.category).toEqual('Manual');
    });

    it('admin uploads with a custom category', async () => {
      const res = await request(app.getHttpServer())
        .post('/knowledge')
        .set('Authorization', auth(adminToken))
        .field('title', 'Custom Guide')
        .field('category', 'Guidelines')
        .attach('file', PDF_BUFFER, 'guide.pdf')
        .expect(HttpStatus.CREATED);

      expect(res.body.data.category).toEqual('Guidelines');
      expect(res.body.data.kind).toEqual('PDF');
    });

    it('admin uploads a word document', async () => {
      const res = await request(app.getHttpServer())
        .post('/knowledge')
        .set('Authorization', auth(adminToken))
        .field('title', 'Word Doc')
        .field('category', 'Manual')
        .attach('file', Buffer.from('PK mock docx for e2e'), 'doc.docx')
        .expect(HttpStatus.CREATED);

      expect(res.body.data.kind).toEqual('DOCX');
    });

    it('member lists and downloads it', async () => {
      const list = await request(app.getHttpServer())
        .get('/knowledge')
        .set('Authorization', auth(memberToken))
        .expect(HttpStatus.OK);
      expect(list.body.data.length).toBeGreaterThan(0);

      await request(app.getHttpServer())
        .get(`/knowledge/${docId}/file`)
        .set('Authorization', auth(memberToken))
        .expect(HttpStatus.OK)
        .expect('Content-Type', 'application/pdf');
    });
  });

  let ticketId: number;

  describe('Support tickets', () => {
    it('member opens a ticket', async () => {
      const res = await request(app.getHttpServer())
        .post('/support-tickets')
        .set('Authorization', auth(memberToken))
        .send({
          subject: 'Cannot attach PDF',
          category: 'Report submission',
          priority: 'High',
          description: 'Upload fails on quarterly reports.',
        })
        .expect(HttpStatus.CREATED);

      ticketId = res.body.data.id;
      expect(res.body.data.status).toEqual('Open');
    });

    it('member sees only their own tickets', async () => {
      await request(app.getHttpServer())
        .post('/support-tickets')
        .set('Authorization', auth(adminToken))
        .send({
          subject: 'Admin ticket',
          category: 'Other',
          priority: 'Low',
          description: 'Admin-only ticket.',
        })
        .expect(HttpStatus.CREATED);

      const res = await request(app.getHttpServer())
        .get('/support-tickets')
        .set('Authorization', auth(memberToken))
        .expect(HttpStatus.OK);
      expect(res.body.data.length).toEqual(1);
      expect(res.body.data[0].id).toEqual(ticketId);
    });

    it('member status edits are stripped', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/support-tickets/${ticketId}`)
        .set('Authorization', auth(memberToken))
        .send({ status: 'Resolved' })
        .expect(HttpStatus.OK);
      expect(res.body.data.status).toEqual('Open');
    });

    it('admin triages the ticket', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/support-tickets/${ticketId}`)
        .set('Authorization', auth(adminToken))
        .send({ status: 'In progress' })
        .expect(HttpStatus.OK);
      expect(res.body.data.status).toEqual('In progress');
    });
  });

  let certId: number;

  describe('Certificates', () => {
    it('member records a certificate (pending)', async () => {
      const res = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', auth(memberToken))
        .send({
          memberName: 'Member One',
          course: 'Cybersecurity Fundamentals',
          issuer: 'IBM SkillsBuild',
          dateIssued: '2026-10-01',
        })
        .expect(HttpStatus.CREATED);

      certId = res.body.data.id;
      expect(res.body.data.status).toEqual('pending');
    });

    it('member cannot self-verify', async () => {
      await request(app.getHttpServer())
        .patch(`/certificates/${certId}`)
        .set('Authorization', auth(memberToken))
        .send({ status: 'verified' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('admin verifies it', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/certificates/${certId}`)
        .set('Authorization', auth(adminToken))
        .send({ status: 'verified' })
        .expect(HttpStatus.OK);
      expect(res.body.data.status).toEqual('verified');
    });

    it('another member cannot read it', async () => {
      await request(app.getHttpServer())
        .get(`/certificates/${certId}`)
        .set('Authorization', auth(member2Token))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('leaderboard ranks verified certificates only', async () => {
      const res = await request(app.getHttpServer())
        .get('/certificates/leaderboard')
        .set('Authorization', auth(memberToken))
        .expect(HttpStatus.OK);

      expect(res.body.data.length).toEqual(1);
      expect(res.body.data[0].memberName).toEqual('Member One');
      expect(res.body.data[0].certificates).toEqual(1);
      expect(res.body.data[0].points).toEqual(100);
    });

    it('leaderboard requires authentication', async () => {
      await request(app.getHttpServer()).get('/certificates/leaderboard').expect(HttpStatus.UNAUTHORIZED);
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDBAfterTest();
  });
});
