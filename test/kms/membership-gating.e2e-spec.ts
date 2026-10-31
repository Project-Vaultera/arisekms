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

describe('Membership gating (e2e)', () => {
  let app: INestApplication;
  let adminToken: AuthTokenOutput;
  let applicantToken: AuthTokenOutput;
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
    ({ token: applicantToken } = await registerAndLogin(app.getHttpServer(), 'applicant-one'));
  });

  const auth = (token: AuthTokenOutput) => `Bearer ${token.accessToken}`;

  it('applicant applies: creates own company shell as draft member', async () => {
    const res = await request(app.getHttpServer())
      .post('/companies/apply')
      .set('Authorization', auth(applicantToken))
      .send({ name: 'Applicant Corp' })
      .expect(HttpStatus.CREATED);

    companyId = res.body.data.id;
    expect(res.body.data.name).toEqual('Applicant Corp');
    expect(res.body.data.members.map((m: { username: string }) => m.username)).toContain(
      'applicant-one',
    );
  });

  it('second application while one is pending is rejected', async () => {
    await request(app.getHttpServer())
      .post('/companies/apply')
      .set('Authorization', auth(applicantToken))
      .send({ name: 'Second Corp' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('member cannot use the admin create endpoint', async () => {
    await request(app.getHttpServer())
      .post('/companies')
      .set('Authorization', auth(applicantToken))
      .send({ name: 'Sneaky Corp' })
      .expect(HttpStatus.FORBIDDEN);
  });

  it('pending applicant cannot submit reports, certificates, or tickets', async () => {
    await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', auth(applicantToken))
      .field('category', 'quarterly')
      .attach('file', PDF_BUFFER, 'draft.pdf')
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .post('/certificates')
      .set('Authorization', auth(applicantToken))
      .send({ memberName: 'Applicant', course: 'Course', issuer: 'IBM SkillsBuild', dateIssued: '2026-10-01' })
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .post('/support-tickets')
      .set('Authorization', auth(applicantToken))
      .send({ subject: 'Help', category: 'Report submission', priority: 'High', description: 'Need help.' })
      .expect(HttpStatus.FORBIDDEN);
  });

  it('admin bypasses the gate without a company', async () => {
    await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', auth(adminToken))
      .field('category', 'quarterly')
      .attach('file', PDF_BUFFER, 'admin.pdf')
      .expect(HttpStatus.CREATED);
  });

  it('approved applicant can submit', async () => {
    await request(app.getHttpServer())
      .post(`/companies/${companyId}/review`)
      .set('Authorization', auth(adminToken))
      .send({ status: 'approved' })
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', auth(applicantToken))
      .field('category', 'quarterly')
      .attach('file', PDF_BUFFER, 'member.pdf')
      .expect(HttpStatus.CREATED);

    await request(app.getHttpServer())
      .post('/support-tickets')
      .set('Authorization', auth(applicantToken))
      .send({ subject: 'Help', category: 'Report submission', priority: 'High', description: 'Need help.' })
      .expect(HttpStatus.CREATED);
  });

  describe('member-scoped roster and logo', () => {
    // 1x1 transparent PNG.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    let mateToken: AuthTokenOutput;
    let strangerToken: AuthTokenOutput;

    it('registers a second member', async () => {
      ({ token: mateToken } = await registerAndLogin(app.getHttpServer(), 'roster-mate'));
      ({ token: strangerToken } = await registerAndLogin(app.getHttpServer(), 'true-stranger'));
    });

    it('member adds roster member by username (idempotent)', async () => {
      for (let i = 0; i < 2; i++) {
        const res = await request(app.getHttpServer())
          .post(`/companies/${companyId}/roster`)
          .set('Authorization', auth(applicantToken))
          .send({ username: 'roster-mate' })
          .expect(HttpStatus.CREATED);
        expect(res.body.data.members.map((m: { username: string }) => m.username)).toContain('roster-mate');
      }
    });

    it('unknown username is rejected', async () => {
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/roster`)
        .set('Authorization', auth(applicantToken))
        .send({ username: 'nobody-here' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('outsider cannot touch the roster', async () => {
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/roster`)
        .set('Authorization', auth(strangerToken))
        .send({ username: 'roster-mate' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('member cannot remove themselves', async () => {
      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', auth(applicantToken))
        .expect(HttpStatus.OK);
      await request(app.getHttpServer())
        .delete(`/companies/${companyId}/roster/${me.body.data.id}`)
        .set('Authorization', auth(applicantToken))
        .expect(HttpStatus.FORBIDDEN);
    });

    it('member removes the roster mate (idempotent)', async () => {
      const mate = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', auth(mateToken))
        .expect(HttpStatus.OK);
      for (let i = 0; i < 2; i++) {
        const res = await request(app.getHttpServer())
          .delete(`/companies/${companyId}/roster/${mate.body.data.id}`)
          .set('Authorization', auth(applicantToken))
          .expect(HttpStatus.OK);
        expect(res.body.data.members.map((m: { username: string }) => m.username)).not.toContain('roster-mate');
      }
    });

    it('member uploads and downloads the logo; non-images rejected', async () => {
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/logo`)
        .set('Authorization', auth(applicantToken))
        .attach('file', PDF_BUFFER, 'logo.pdf')
        .expect(HttpStatus.BAD_REQUEST);

      const up = await request(app.getHttpServer())
        .post(`/companies/${companyId}/logo`)
        .set('Authorization', auth(applicantToken))
        .attach('file', png, 'logo.png')
        .expect(HttpStatus.CREATED);
      expect(up.body.data.logoOriginalName).toEqual('logo.png');

      await request(app.getHttpServer())
        .get(`/companies/${companyId}/logo/file`)
        .set('Authorization', auth(applicantToken))
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .get(`/companies/${companyId}/logo/file`)
        .set('Authorization', auth(mateToken))
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDBAfterTest();
  });
});
