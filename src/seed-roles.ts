import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from './app.module';
import { ROLE } from './auth/constants/role.constant';
import { RequestContext } from './shared/request-context/request-context.dto';
import {
  assertSeedingAllowed,
  handleSeedRefusal,
  parseSeedOnly,
  resolveSeedPassword,
} from './shared/seeds/seeding-gate';
import { UserService } from './user/services/user.service';

const SEED_NAME = 'seed:roles';
const PASSWORD_ENV = 'SEED_ROLES_PASSWORD';
// Development default only. Production requires SEED_ROLES_PASSWORD — see
// docs/specs/production-seeding.md.
const DEV_PASSWORD = 'Arise@2026';

const SEEDS: Array<{
  username: string;
  name: string;
  email: string;
  roles: ROLE[];
}> = [
  {
    username: 'ariseitadmin',
    name: 'Arise IT Admin',
    email: 'arise.itadmin@example.com',
    roles: [ROLE.ARISE_IT_ADMIN],
  },
  {
    username: 'arisesecretariat',
    name: 'Arise Secretariat',
    email: 'arise.secretariat@example.com',
    roles: [ROLE.ARISE_SECRETARIAT],
  },
  {
    username: 'arisemember',
    name: 'Arise Member',
    email: 'arise.member@example.com',
    roles: [ROLE.ARISE_MEMBER],
  },
  {
    username: 'ariseanalyst',
    name: 'Arise Data Analyst',
    email: 'arise.analyst@example.com',
    roles: [ROLE.ARISE_DATA_ANALYST],
  },
];

// SEED_ROLES_ONLY narrows the run, e.g. to avoid handing out an IT admin
// account on a live deployment. Unknown names fail loudly instead of being
// silently ignored (a typo would otherwise look like a successful seed).
function selectSeeds(): typeof SEEDS | null {
  const only = parseSeedOnly(process.env.SEED_ROLES_ONLY);
  if (!only) {
    return SEEDS;
  }

  const unknown = only.filter(
    (username) => !SEEDS.some((seed) => seed.username === username),
  );
  if (unknown.length) {
    console.error(
      `SEED_ROLES_ONLY lists unknown account(s): ${unknown.join(', ')}. ` +
        `Known: ${SEEDS.map((seed) => seed.username).join(', ')}.`,
    );
    process.exitCode = 1;
    return null;
  }

  return SEEDS.filter((seed) => only.includes(seed.username));
}

async function bootstrap() {
  try {
    assertSeedingAllowed(SEED_NAME, PASSWORD_ENV);
  } catch (error) {
    if (handleSeedRefusal(error)) {
      return;
    }
    throw error;
  }

  const password = resolveSeedPassword(PASSWORD_ENV, DEV_PASSWORD);
  const seeds = selectSeeds();
  if (!seeds) {
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const users = app.get(UserService);
    const dataSource = app.get(DataSource);
    const ctx = new RequestContext();
    ctx.requestID = 'seed-roles';

    let created = 0;
    let reset = 0;

    for (const s of seeds) {
      const found = await users.findByUsername(ctx, s.username);
      if (!found) {
        await users.createUser(ctx, {
          name: s.name,
          username: s.username,
          password,
          roles: s.roles,
          isAccountDisabled: false,
          email: s.email,
        });
        created += 1;
        console.log(`created ${s.username} (${s.roles[0]})`);
      } else {
        // Reset password + role so POV checks are repeatable.
        await users.updateUser(ctx, found.id, { password } as never);
        await dataSource.query(
          `UPDATE users SET roles = $1, "isAccountDisabled" = false WHERE id = $2`,
          [s.roles[0], found.id],
        );
        reset += 1;
        console.log(`reset ${s.username} (${s.roles[0]})`);
      }
    }

    // Never print the password itself: container logs are readable by anyone
    // with host access and outlive the seeding run.
    const source = (process.env[PASSWORD_ENV] ?? '').trim()
      ? PASSWORD_ENV
      : 'development default';
    console.log(
      `${SEED_NAME}: ${created} created, ${reset} reset. ` +
        `Password source: ${source}.`,
    );
  } finally {
    await app.close();
  }
}
bootstrap();
