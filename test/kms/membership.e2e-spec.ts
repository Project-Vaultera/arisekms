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

const FULL_PROFILE = {
  legalRepName: 'Jane Rep',
  legalRepTitle: 'President',
  applicantCountry: 'Philippines',
  registeredCountry: 'Philippines',
  sector: 'Manufacturing',
  isTradeAssociation: false,
  isBusinessAssociation: true,
  street: '123 Industry St',
  city: 'Makati',
  province: 'Metro Manila',
  zip: '1229',
  country: 'Philippines',
  phone: '+63285550100',
  website: 'https://example.com',
  fax: '+63285550101',
  staffCount: 120,
  annualRevenue: 'PHP 50M',
  unGlobalCompact: true,
  otherUnAgency: true,
  whichAgency: 'UNDRR',
  businessOverview: 'We make resilient widgets.',
  geographicFocus: 'Luzon',
};

const PRIMARY_CONTACT = {
  isPrimary: true,
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  position: 'Secretary',
  email: 'juan@example.com',
  phone: '+639171234567',
  sameAsRegistered: true,
};

describe('Membership profile (e2e)', () => {
  let app: INestApplication;
  let adminToken: AuthTokenOutput;
  let memberToken: AuthTokenOutput;
  let outsiderToken: AuthTokenOutput;
  let memberUser: UserOutput;
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
    ({ user: memberUser, token: memberToken } = await registerAndLogin(
      app.getHttpServer(),
      'member-one',
    ));
    ({ token: outsiderToken } = await registerAndLogin(app.getHttpServer(), 'outsider-one'));

    const created = await request(app.getHttpServer())
      .post('/companies')
      .set('Authorization', `Bearer ${adminToken.accessToken}`)
      .send({ name: 'Member Corp' })
      .expect(HttpStatus.CREATED);
    companyId = created.body.data.id;

    await request(app.getHttpServer())
      .post(`/companies/${companyId}/members`)
      .set('Authorization', `Bearer ${adminToken.accessToken}`)
      .send({ userId: memberUser.id })
      .expect(HttpStatus.OK);
  });

  const auth = (token: AuthTokenOutput) => `Bearer ${token.accessToken}`;

  it('outsider cannot read the profile', async () => {
    await request(app.getHttpServer())
      .get(`/companies/${companyId}/profile`)
      .set('Authorization', auth(outsiderToken))
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('member saves a draft and reads it back', async () => {
    const res = await request(app.getHttpServer())
      .put(`/companies/${companyId}/profile`)
      .set('Authorization', auth(memberToken))
      .send({ legalRepName: 'Jane Rep' })
      .expect(HttpStatus.OK);
    expect(res.body.data.legalRepName).toEqual('Jane Rep');
    expect(res.body.data.status).toEqual('draft');
  });

  it('submit fails without required fields', async () => {
    const res = await request(app.getHttpServer())
      .post(`/companies/${companyId}/submit`)
      .set('Authorization', auth(memberToken))
      .expect(HttpStatus.BAD_REQUEST);
    // Errors are wrapped by the global filter: { error: { message } }.
    expect(String(res.body.error?.message ?? res.body.message)).toMatch(/Missing or invalid/);
  });

  it('member cannot submit for another company', async () => {
    await request(app.getHttpServer())
      .post(`/companies/999999/submit`)
      .set('Authorization', auth(memberToken))
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('full application submits (explanation covers missing proof)', async () => {
    await request(app.getHttpServer())
      .put(`/companies/${companyId}/profile`)
      .set('Authorization', auth(memberToken))
      .send({ ...FULL_PROFILE, noAttachmentExplanation: 'SEC cert pending release' })
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post(`/companies/${companyId}/contacts`)
      .set('Authorization', auth(memberToken))
      .send(PRIMARY_CONTACT)
      .expect(HttpStatus.CREATED);

    const submitted = await request(app.getHttpServer())
      .post(`/companies/${companyId}/submit`)
      .set('Authorization', auth(memberToken))
      .expect(HttpStatus.OK);
    expect(submitted.body.data.status).toEqual('submitted');
    // sameAsRegistered snapshots the company address into the contact.
    const primary = submitted.body.data.contacts.find((c: { isPrimary: boolean }) => c.isPrimary);
    expect(primary.street).toEqual('123 Industry St');
    expect(primary.city).toEqual('Makati');
  });

  it('member cannot edit while submitted', async () => {
    await request(app.getHttpServer())
      .put(`/companies/${companyId}/profile`)
      .set('Authorization', auth(memberToken))
      .send({ city: 'Quezon City' })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('admin rejects without reason fails, with reason succeeds', async () => {
    await request(app.getHttpServer())
      .post(`/companies/${companyId}/review`)
      .set('Authorization', auth(adminToken))
      .send({ status: 'rejected' })
      .expect(HttpStatus.BAD_REQUEST);

    const rejected = await request(app.getHttpServer())
      .post(`/companies/${companyId}/review`)
      .set('Authorization', auth(adminToken))
      .send({ status: 'rejected', reason: 'Fax number unreadable' })
      .expect(HttpStatus.OK);
    expect(rejected.body.data.status).toEqual('rejected');
    expect(rejected.body.data.rejectReason).toEqual('Fax number unreadable');
  });

  it('member cannot approve', async () => {
    await request(app.getHttpServer())
      .post(`/companies/${companyId}/submit`)
      .set('Authorization', auth(memberToken))
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post(`/companies/${companyId}/review`)
      .set('Authorization', auth(memberToken))
      .send({ status: 'approved' })
      .expect(HttpStatus.FORBIDDEN);
  });

  it('admin approves; member edit reopens draft', async () => {
    await request(app.getHttpServer())
      .post(`/companies/${companyId}/review`)
      .set('Authorization', auth(adminToken))
      .send({ status: 'approved' })
      .expect(HttpStatus.OK);

    const edited = await request(app.getHttpServer())
      .put(`/companies/${companyId}/profile`)
      .set('Authorization', auth(memberToken))
      .send({ city: 'Quezon City' })
      .expect(HttpStatus.OK);
    expect(edited.body.data.status).toEqual('draft');
    expect(edited.body.data.city).toEqual('Quezon City');
  });

  it('additional contact requires names, email, and type', async () => {
    const bad = await request(app.getHttpServer())
      .post(`/companies/${companyId}/contacts`)
      .set('Authorization', auth(memberToken))
      .send({ firstName: 'Extra' })
      .expect(HttpStatus.CREATED);

    await request(app.getHttpServer())
      .post(`/companies/${companyId}/submit`)
      .set('Authorization', auth(memberToken))
      .expect(HttpStatus.BAD_REQUEST);

    await request(app.getHttpServer())
      .delete(`/companies/${companyId}/contacts/${bad.body.data.contacts.find((c: { firstName: string }) => c.firstName === 'Extra').id}`)
      .set('Authorization', auth(memberToken))
      .expect(HttpStatus.OK);
  });

  afterAll(async () => {
    await app.close();
    await closeDBAfterTest();
  });
});
