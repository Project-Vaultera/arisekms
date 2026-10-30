import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
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
): Promise<{ user: UserOutput; token: AuthTokenOutput }> {
  const reg = await request(server)
    .post('/auth/register')
    .send({
      name: username,
      username,
      password: 'member-pass-1',
      email: `${username}@example.com`,
    })
    .expect(HttpStatus.CREATED);

  const login = await request(server)
    .post('/auth/login')
    .send({ username, password: 'member-pass-1' })
    .expect(HttpStatus.OK);

  return { user: reg.body.data, token: login.body.data };
}

describe('Company visibility (e2e)', () => {
  let app: INestApplication;
  let adminToken: AuthTokenOutput;
  let a1Token: AuthTokenOutput;
  let a2Token: AuthTokenOutput;
  let bToken: AuthTokenOutput;
  let a1User: UserOutput;
  let a2User: UserOutput;
  let bUser: UserOutput;
  let companyId: number;

  beforeAll(async () => {
    await resetDBBeforeTest();
    await createDBEntities();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    ({ authTokenForAdmin: adminToken } = await seedAdminUser(app));
    ({ user: a1User, token: a1Token } = await registerAndLogin(app.getHttpServer(), 'comp-a-one'));
    ({ user: a2User, token: a2Token } = await registerAndLogin(app.getHttpServer(), 'comp-a-two'));
    ({ user: bUser, token: bToken } = await registerAndLogin(app.getHttpServer(), 'comp-b-one'));
  });

  const auth = (token: AuthTokenOutput) => `Bearer ${token.accessToken}`;

  describe('Company management', () => {
    it('admin creates a company', async () => {
      const res = await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', auth(adminToken))
        .send({ name: 'Acme Corp' })
        .expect(HttpStatus.CREATED);

      companyId = res.body.data.id;
      expect(res.body.data.name).toEqual('Acme Corp');
      expect(res.body.data.members).toEqual([]);
    });

    it('member cannot create a company', async () => {
      await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', auth(a1Token))
        .send({ name: 'Sneaky Inc' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('admin assigns two members (idempotent re-add)', async () => {
      const steps: Array<{ userId: number; expected: number[] }> = [
        { userId: a1User.id, expected: [a1User.id] },
        { userId: a2User.id, expected: [a1User.id, a2User.id] },
        { userId: a1User.id, expected: [a1User.id, a2User.id] },
      ];
      for (const step of steps) {
        const res = await request(app.getHttpServer())
          .post(`/companies/${companyId}/members`)
          .set('Authorization', auth(adminToken))
          .send({ userId: step.userId })
          .expect(HttpStatus.OK);
        expect(res.body.data.members.map((m: any) => m.id).sort()).toEqual(step.expected.sort());
      }
      // New flow: submissions require an approved company.
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/review`)
        .set('Authorization', auth(adminToken))
        .send({ status: 'approved' })
        .expect(HttpStatus.OK);
    });

    it('member lists only their own companies', async () => {
      const res = await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', auth(a1Token))
        .expect(HttpStatus.OK);
      expect(res.body.data.length).toEqual(1);
      expect(res.body.data[0].name).toEqual('Acme Corp');
      expect(res.body.data[0].members).toHaveLength(2);
      expect(res.body.data[0].password).toBeUndefined();
    });

    it('outsider lists no companies and cannot read the company', async () => {
      const res = await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', auth(bToken))
        .expect(HttpStatus.OK);
      expect(res.body.data).toEqual([]);

      await request(app.getHttpServer())
        .get(`/companies/${companyId}`)
        .set('Authorization', auth(bToken))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('member cannot assign members', async () => {
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/members`)
        .set('Authorization', auth(a1Token))
        .send({ userId: bUser.id })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  let reportId: number;
  let ticketId: number;
  let certId: number;

  describe('Company-scoped reports', () => {
    it('member A1 submits a report', async () => {
      const res = await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', auth(a1Token))
        .field('category', 'quarterly')
        .attach('file', PDF_BUFFER, 'a1-report.pdf')
        .expect(HttpStatus.CREATED);
      reportId = res.body.data.id;
    });

    it('same-company member A2 lists, reads, and downloads it', async () => {
      const list = await request(app.getHttpServer())
        .get('/reports')
        .set('Authorization', auth(a2Token))
        .expect(HttpStatus.OK);
      expect(list.body.data.map((r: any) => r.id)).toContain(reportId);

      await request(app.getHttpServer())
        .get(`/reports/${reportId}`)
        .set('Authorization', auth(a2Token))
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .get(`/reports/${reportId}/file`)
        .set('Authorization', auth(a2Token))
        .expect(HttpStatus.OK);
    });

    it('outsider cannot list, read, or download it', async () => {
      const list = await request(app.getHttpServer())
        .get('/reports')
        .set('Authorization', auth(bToken))
        .expect(HttpStatus.OK);
      expect(list.body.data.map((r: any) => r.id)).not.toContain(reportId);

      await request(app.getHttpServer())
        .get(`/reports/${reportId}`)
        .set('Authorization', auth(bToken))
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .get(`/reports/${reportId}/file`)
        .set('Authorization', auth(bToken))
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Company-scoped tickets and certificates', () => {
    it('member A1 opens a ticket and records a certificate', async () => {
      const ticket = await request(app.getHttpServer())
        .post('/support-tickets')
        .set('Authorization', auth(a1Token))
        .send({
          subject: 'Cannot attach PDF',
          category: 'Report submission',
          priority: 'High',
          description: 'Upload fails on quarterly reports.',
        })
        .expect(HttpStatus.CREATED);
      ticketId = ticket.body.data.id;

      const cert = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', auth(a1Token))
        .send({
          memberName: 'Acme Member',
          course: 'First Aid Basics',
          issuer: 'IBM SkillsBuild',
          dateIssued: '2026-10-01',
        })
        .expect(HttpStatus.CREATED);
      certId = cert.body.data.id;

      await request(app.getHttpServer())
        .patch(`/certificates/${certId}`)
        .set('Authorization', auth(adminToken))
        .send({ status: 'verified' })
        .expect(HttpStatus.OK);
    });

    it('same-company member reads the ticket and certificate', async () => {
      await request(app.getHttpServer())
        .get(`/support-tickets/${ticketId}`)
        .set('Authorization', auth(a2Token))
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .get(`/certificates/${certId}`)
        .set('Authorization', auth(a2Token))
        .expect(HttpStatus.OK);
    });

    it('outsider cannot read the ticket or certificate', async () => {
      await request(app.getHttpServer())
        .get(`/support-tickets/${ticketId}`)
        .set('Authorization', auth(bToken))
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .get(`/certificates/${certId}`)
        .set('Authorization', auth(bToken))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('leaderboard is company-scoped for members, full for admins', async () => {
      // Outsider gets their own approved company first (new flow: writes need approval).
      const otherCompany = await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', auth(adminToken))
        .send({ name: 'Other Corp' })
        .expect(HttpStatus.CREATED);
      await request(app.getHttpServer())
        .post(`/companies/${otherCompany.body.data.id}/members`)
        .set('Authorization', auth(adminToken))
        .send({ userId: bUser.id })
        .expect(HttpStatus.OK);
      await request(app.getHttpServer())
        .post(`/companies/${otherCompany.body.data.id}/review`)
        .set('Authorization', auth(adminToken))
        .send({ status: 'approved' })
        .expect(HttpStatus.OK);

      const outsiderCert = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', auth(bToken))
        .send({
          memberName: 'Other Member',
          course: 'Other Course',
          issuer: 'IBM SkillsBuild',
          dateIssued: '2026-10-02',
        })
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .patch(`/certificates/${outsiderCert.body.data.id}`)
        .set('Authorization', auth(adminToken))
        .send({ status: 'verified' })
        .expect(HttpStatus.OK);

      const memberBoard = await request(app.getHttpServer())
        .get('/certificates/leaderboard')
        .set('Authorization', auth(a2Token))
        .expect(HttpStatus.OK);
      expect(memberBoard.body.data.map((r: any) => r.memberName)).toEqual(['Acme Member']);

      const adminBoard = await request(app.getHttpServer())
        .get('/certificates/leaderboard')
        .set('Authorization', auth(adminToken))
        .expect(HttpStatus.OK);
      expect(adminBoard.body.data.map((r: any) => r.memberName).sort()).toEqual(
        ['Acme Member', 'Other Member'],
      );
    });
  });

  describe('Admin enable/disable accounts', () => {
    it('member cannot toggle accounts', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${bUser.id}`)
        .set('Authorization', auth(a1Token))
        .send({ isAccountDisabled: true })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('admin cannot disable their own account', async () => {
      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', auth(adminToken))
        .expect(HttpStatus.OK);
      await request(app.getHttpServer())
        .patch(`/users/${me.body.data.id}`)
        .set('Authorization', auth(adminToken))
        .send({ isAccountDisabled: true })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('admin disables a member and login is blocked, then re-enables', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${bUser.id}`)
        .set('Authorization', auth(adminToken))
        .send({ isAccountDisabled: true })
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'comp-b-one', password: 'member-pass-1' })
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .patch(`/users/${bUser.id}`)
        .set('Authorization', auth(adminToken))
        .send({ isAccountDisabled: false })
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'comp-b-one', password: 'member-pass-1' })
        .expect(HttpStatus.OK);
    });
  });

  describe('Membership removal', () => {    it('admin removes A2 (idempotent) and A2 loses access', async () => {
      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .delete(`/companies/${companyId}/members/${a2User.id}`)
          .set('Authorization', auth(adminToken))
          .expect(HttpStatus.OK);
      }

      await request(app.getHttpServer())
        .get(`/reports/${reportId}`)
        .set('Authorization', auth(a2Token))
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDBAfterTest();
  });
});
