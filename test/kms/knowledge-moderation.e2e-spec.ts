import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { ROLE } from '../../src/auth/constants/role.constant';
import { AuthTokenOutput } from '../../src/auth/dtos/auth-token-output.dto';
import { resetLoginThrottle } from '../../src/auth/guards/login-throttle.guard';
import {
  closeDBAfterTest,
  createDBEntities,
  resetDBBeforeTest,
  seedAdminUser,
} from '../test-utils';

describe('Knowledge moderation (e2e)', () => {
  let app: INestApplication;
  let authTokenForAdmin: AuthTokenOutput;

  const pdf = (name = 'guide.pdf') => ({
    buf: Buffer.from('%PDF-1.4 fake-content for e2e'),
    name,
  });

  async function registerAndLogin(username: string): Promise<string> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: username, username, password: 'member-pass-1', email: `${username}@example.com` })
      .expect(HttpStatus.CREATED);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password: 'member-pass-1' })
      .expect(HttpStatus.OK);
    return login.body.data.accessToken as string;
  }

  async function inviteAndLogin(username: string, role: ROLE): Promise<string> {
    await request(app.getHttpServer())
      .post('/users/invite')
      .set('Authorization', `Bearer ${authTokenForAdmin.accessToken}`)
      .send({ username, name: username, email: `${username}@example.com`, password: 'member-pass-1', roles: [role], isAccountDisabled: false })
      .expect(HttpStatus.CREATED);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password: 'member-pass-1' })
      .expect(HttpStatus.OK);
    return login.body.data.accessToken as string;
  }

  async function uploadDoc(token: string, title: string, file = pdf()): Promise<number> {
    const res = await request(app.getHttpServer())
      .post('/knowledge')
      .set('Authorization', `Bearer ${token}`)
      .field('title', title)
      .field('category', 'Manual')
      .attach('file', file.buf, file.name)
      .expect(HttpStatus.CREATED);
    return res.body.data.id as number;
  }

  beforeAll(async () => {
    resetLoginThrottle();
    await resetDBBeforeTest();
    await createDBEntities();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    ({ authTokenForAdmin } = await seedAdminUser(app));
  }, 30000);

  it('staff uploads go live as approved', async () => {
    const id = await uploadDoc(authTokenForAdmin.accessToken, 'Staff Guide');
    const res = await request(app.getHttpServer())
      .get(`/knowledge/${id}`)
      .set('Authorization', `Bearer ${authTokenForAdmin.accessToken}`)
      .expect(HttpStatus.OK);
    expect(res.body.data.status).toEqual('approved');
  });

  describe('member submission flow', () => {
    let memberToken: string;
    let otherToken: string;
    let secretariatToken: string;
    let analystToken: string;
    let docId: number;

    beforeAll(async () => {
      resetLoginThrottle();
      memberToken = await registerAndLogin('docauthor');
      otherToken = await registerAndLogin('docstranger');
      secretariatToken = await inviteAndLogin('docsecretariat', ROLE.ARISE_SECRETARIAT);
      analystToken = await inviteAndLogin('docanalyst', ROLE.ARISE_DATA_ANALYST);
    }, 30000);

    it('member uploads land as submitted and stay visible to the author', async () => {
      docId = await uploadDoc(memberToken, 'Member Guide');
      const res = await request(app.getHttpServer())
        .get(`/knowledge/${docId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(HttpStatus.OK);
      expect(res.body.data.status).toEqual('submitted');
    });

    it('hides submitted docs from other members and analysts', async () => {
      await request(app.getHttpServer())
        .get(`/knowledge/${docId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
      await request(app.getHttpServer())
        .get(`/knowledge/${docId}`)
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('shows submitted docs to reviewers', async () => {
      await request(app.getHttpServer())
        .get(`/knowledge/${docId}`)
        .set('Authorization', `Bearer ${secretariatToken}`)
        .expect(HttpStatus.OK);
    });

    it('rejects review without a reason and approves with history', async () => {
      await request(app.getHttpServer())
        .post(`/knowledge/${docId}/review`)
        .set('Authorization', `Bearer ${secretariatToken}`)
        .send({ status: 'rejected' })
        .expect((res) => expect([HttpStatus.BAD_REQUEST, HttpStatus.UNPROCESSABLE_ENTITY]).toContain(res.status));

      await request(app.getHttpServer())
        .post(`/knowledge/${docId}/review`)
        .set('Authorization', `Bearer ${secretariatToken}`)
        .send({ status: 'rejected', reason: 'Needs an executive summary' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.status).toEqual('rejected');
          expect(res.body.data.rejectReason).toEqual('Needs an executive summary');
        });
    });

    it('shows the rejection to the author and resubmits on edit', async () => {
      const mine = await request(app.getHttpServer())
        .get(`/knowledge/${docId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(HttpStatus.OK);
      expect(mine.body.data.status).toEqual('rejected');

      await request(app.getHttpServer())
        .patch(`/knowledge/${docId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Member Guide v2' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.status).toEqual('submitted');
          expect(res.body.data.rejectReason).toBeNull();
        });

      await request(app.getHttpServer())
        .post(`/knowledge/${docId}/review`)
        .set('Authorization', `Bearer ${secretariatToken}`)
        .send({ status: 'approved' })
        .expect(HttpStatus.OK);
    });

    it('publishes approved docs to everyone including analysts', async () => {
      await request(app.getHttpServer())
        .get(`/knowledge/${docId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(HttpStatus.OK);
      await request(app.getHttpServer())
        .get(`/knowledge/${docId}`)
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(HttpStatus.OK);
    });

    it('locks approved docs against author edits and deletes', async () => {
      await request(app.getHttpServer())
        .patch(`/knowledge/${docId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Sneaky edit' })
        .expect(HttpStatus.UNAUTHORIZED);
      await request(app.getHttpServer())
        .delete(`/knowledge/${docId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('exposes the activity timeline to author and reviewers, not strangers', async () => {
      const mine = await request(app.getHttpServer())
        .get(`/knowledge/${docId}/history`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(HttpStatus.OK);
      const actions = (mine.body.data as Array<{ action: string }>).map((e) => e.action);
      expect(actions).toEqual(
        expect.arrayContaining(['KNOWLEDGE_UPLOADED', 'KNOWLEDGE_REJECTED', 'KNOWLEDGE_RESUBMITTED', 'KNOWLEDGE_APPROVED']),
      );

      await request(app.getHttpServer())
        .get(`/knowledge/${docId}/history`)
        .set('Authorization', `Bearer ${secretariatToken}`)
        .expect(HttpStatus.OK);

      // Strangers cannot see the trail of a still-pending document.
      const pendingId = await uploadDoc(memberToken, 'Pending Trail Guide');
      await request(app.getHttpServer())
        .get(`/knowledge/${pendingId}/history`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
      await request(app.getHttpServer())
        .delete(`/knowledge/${pendingId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });

    it('lets authors delete their own pending docs', async () => {
      const pendingId = await uploadDoc(memberToken, 'Throwaway Guide');
      await request(app.getHttpServer())
        .delete(`/knowledge/${pendingId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });

    it('rejects member review attempts', async () => {
      const pendingId = await uploadDoc(memberToken, 'Another Guide');
      await request(app.getHttpServer())
        .post(`/knowledge/${pendingId}/review`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'approved' })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDBAfterTest();
  });
});
