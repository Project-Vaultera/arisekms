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

  afterAll(async () => {
    await app.close();
    await closeDBAfterTest();
  });
});
