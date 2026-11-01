import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AuthTokenOutput } from '../../src/auth/dtos/auth-token-output.dto';
import { resetLoginThrottle } from '../../src/auth/guards/login-throttle.guard';
import { UserOutput } from '../../src/user/dtos/user-output.dto';
import {
  closeDBAfterTest,
  createDBEntities,
  resetDBBeforeTest,
  seedAdminUser,
} from '../test-utils';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let adminUser: UserOutput;
  let authTokenForAdmin: AuthTokenOutput;

  beforeAll(async () => {
    await resetDBBeforeTest();
    await createDBEntities();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    ({ adminUser, authTokenForAdmin } = await seedAdminUser(app));
  });

  describe('Get user me', () => {
    it('gets user me', async () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer ' + authTokenForAdmin.accessToken)
        .expect(HttpStatus.OK);
    });

    it('Unauthorized error when BearerToken is not provided', async () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('Unauthorized error when BearerToken is wrong', async () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer ' + 'abcd')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('get all users', () => {
    it('returns all users', async () => {
      const expectedOutput = [adminUser];

      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer ' + authTokenForAdmin.accessToken)
        .expect(HttpStatus.OK)
        .expect({ data: expectedOutput, meta: { count: 1 } });
    });
  });

  describe('get a user by Id', () => {
    it('admin gets a user by Id', async () => {
      const expectedOutput = adminUser;

      return request(app.getHttpServer())
        .get('/users/1')
        .set('Authorization', 'Bearer ' + authTokenForAdmin.accessToken)
        .expect(HttpStatus.OK)
        .expect({ data: expectedOutput, meta: {} });
    });

    it('throws NOT_FOUND when user doesnt exist', () => {
      return request(app.getHttpServer())
        .get('/users/99')
        .set('Authorization', 'Bearer ' + authTokenForAdmin.accessToken)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('Unauthorized error when BearerToken is not provided', () => {
      return request(app.getHttpServer())
        .get('/users/1')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  const updateUserInput = {
    name: 'New e2etestername',
    password: '12345678aA12',
  };

  describe('update a user', () => {
    it('admin successfully updates a user', async () => {
      const expectedOutput: UserOutput = {
        ...adminUser,
        ...{ name: 'New e2etestername' },
      };

      const res = await request(app.getHttpServer())
        .patch('/users/1')
        .set('Authorization', 'Bearer ' + authTokenForAdmin.accessToken)
        .send(updateUserInput)
        .expect(HttpStatus.OK);
      const resp = res.body;
      expectedOutput.updatedAt = resp.data.updatedAt;
      expect(resp).toEqual({ data: expectedOutput, meta: {} });

      // Password change bumps tokenVersion, revoking the pre-change token.
      // Re-login so the remaining tests run with a valid token.
      const relogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'default-admin', password: updateUserInput.password })
        .expect(HttpStatus.OK);
      authTokenForAdmin = relogin.body.data;
    });

    it('throws NOT_FOUND when user doesnt exist', () => {
      return request(app.getHttpServer())
        .patch('/users/99')
        .set('Authorization', 'Bearer ' + authTokenForAdmin.accessToken)
        .send(updateUserInput)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('Unauthorized error when BearerToken is not provided', () => {
      return request(app.getHttpServer())
        .patch('/users/1')
        .send(updateUserInput)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('update fails when incorrect password type', () => {
      updateUserInput.password = 12345 as any;
      return request(app.getHttpServer())
        .patch('/users/1')
        .set('Authorization', 'Bearer ' + authTokenForAdmin.accessToken)
        .send(updateUserInput)
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          const resp = res.body;

          expect(resp.error.details.message).toContain(
            'password must be a string',
          );
        });
    });
  });

  describe('update own profile', () => {
    it('member updates own name and email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Self Editor', username: 'self-editor', password: 'member-pass-1', email: 'self-editor@example.com' })
        .expect(HttpStatus.CREATED);

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'self-editor', password: 'member-pass-1' })
        .expect(HttpStatus.OK);
      const token = login.body.data.accessToken;

      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Edited Name', email: 'edited@example.com' })
        .expect(HttpStatus.OK);
      expect(res.body.data.name).toEqual('Edited Name');
      expect(res.body.data.email).toEqual('edited@example.com');
      expect(res.body.data.username).toEqual('self-editor');

      // Role smuggling is ignored: only name + email are self-editable.
      const smuggle = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Edited Name', roles: ['ARISE_IT_ADMIN'] })
        .expect(HttpStatus.OK);
      expect(smuggle.body.data.roles).toEqual(['ARISE_MEMBER']);
    });

    it('duplicate email is rejected', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'self-editor', password: 'member-pass-1' })
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .send({ email: 'default-admin@example.com' })
        .expect(HttpStatus.CONFLICT);
    });

    it('unauthenticated PATCH /me is rejected', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .send({ name: 'Nope' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('own password and sessions', () => {
    const username = 'pw-changer';
    const oldPass = 'member-pass-9';
    const newPass = 'member-pass-10';

    beforeAll(async () => {
      resetLoginThrottle();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Pw Changer', username, password: oldPass, email: 'pw-changer@example.com' })
        .expect(HttpStatus.CREATED);
    });

    async function loginAs(password: string): Promise<string> {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password })
        .expect(HttpStatus.OK);
      return login.body.data.accessToken as string;
    }

    it('rejects a password change without the current password', async () => {
      const token = await loginAs(oldPass);
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: newPass })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('rejects a password change with the wrong current password', async () => {
      const token = await loginAs(oldPass);
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrong-pass', password: newPass })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('changes the password and invalidates the old token', async () => {
      const token = await loginAs(oldPass);
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: oldPass, password: newPass })
        .expect(HttpStatus.OK);

      // Pre-change token no longer works.
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.UNAUTHORIZED);

      // New password works, old password does not.
      await loginAs(newPass);
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password: oldPass })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('revoking sessions invalidates the token', async () => {
      const token = await loginAs(newPass);
      await request(app.getHttpServer())
        .post('/users/me/sessions/revoke')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('own avatar', () => {
    const username = 'avatar-user';
    const password = 'member-pass-7';
    let token: string;

    beforeAll(async () => {
      resetLoginThrottle();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Avatar User', username, password, email: 'avatar-user@example.com' })
        .expect(HttpStatus.CREATED);
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password })
        .expect(HttpStatus.OK);
      token = login.body.data.accessToken;
    });

    it('uploads, downloads, and removes the avatar', async () => {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', png, 'me.png')
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.data.avatarOriginalName).toEqual('me.png');
        });

      await request(app.getHttpServer())
        .get('/users/me/avatar/file')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .delete('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.avatarOriginalName).toBeNull();
        });

      await request(app.getHttpServer())
        .get('/users/me/avatar/file')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('rejects mismatched file types', async () => {
      // PNG magic bytes with a .pdf name: detected image/png ≠ application/pdf.
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', png, 'evil.pdf')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('unauthenticated avatar upload is rejected', async () => {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .attach('file', png, 'me.png')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDBAfterTest();
  });
});
