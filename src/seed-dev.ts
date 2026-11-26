import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ROLE } from './auth/constants/role.constant';
import { RequestContext } from './shared/request-context/request-context.dto';
import { UserService } from './user/services/user.service';

// One account, for a first run: enough to sign in and reach a staff page that
// has something on it. Secretariat rather than IT admin so the navigation is
// short, and secretariat is the role that owns approvals, which is the first
// slice of the app.
//
// Idempotent: the account is matched by username and left alone if it exists,
// so a second run neither duplicates it nor resets a changed password. Remove
// the row to reset it.
const SEED_NAME = 'seed:dev';
// Same value `cli:dev` gives it-admin; one password to read rather than two.
const PASSWORD_ENV = 'DEFAULT_ADMIN_USER_PASSWORD';
const FALLBACK_PASSWORD = 'Arise@2026';

const ACCOUNT = {
  username: 'dev.secretariat',
  name: 'Dev Secretariat',
  email: 'dev.secretariat@example.com',
  roles: [ROLE.ARISE_SECRETARIAT],
};

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const users = app.get(UserService);
    const ctx = new RequestContext();
    ctx.requestID = 'seed-dev';

    const existing = await users.findByUsername(ctx, ACCOUNT.username);
    if (existing) {
      console.log(`${SEED_NAME}: ${ACCOUNT.username} already exists, left as is.`);
      return;
    }

    const password = process.env[PASSWORD_ENV]?.trim() || FALLBACK_PASSWORD;
    await users.createUser(ctx, {
      ...ACCOUNT,
      password,
      isAccountDisabled: false,
    } as never);

    console.log(`${SEED_NAME}: created ${ACCOUNT.username} (${ACCOUNT.roles[0]}).`);
    console.log(`Password: value of ${PASSWORD_ENV} in .env (${FALLBACK_PASSWORD} if unset).`);
    console.log('Sign in at http://localhost:5176/login, then open /approvals.');
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});