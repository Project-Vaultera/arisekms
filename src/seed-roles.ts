import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from './app.module';
import { ROLE } from './auth/constants/role.constant';
import { RequestContext } from './shared/request-context/request-context.dto';
import { UserService } from './user/services/user.service';

const PASSWORD = 'Arise@2026';

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

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const users = app.get(UserService);
    const dataSource = app.get(DataSource);
    const ctx = new RequestContext();
    ctx.requestID = 'seed-roles';

    for (const s of SEEDS) {
      const found = await users.findByUsername(ctx, s.username);
      if (!found) {
        await users.createUser(ctx, {
          name: s.name,
          username: s.username,
          password: PASSWORD,
          roles: s.roles,
          isAccountDisabled: false,
          email: s.email,
        });
        console.log(`created ${s.username} (${s.roles[0]})`);
      } else {
        // Reset password + role so POV checks are repeatable.
        await users.updateUser(ctx, found.id, { password: PASSWORD } as never);
        await dataSource.query(`UPDATE users SET roles = $1, "isAccountDisabled" = false WHERE id = $2`, [
          s.roles[0],
          found.id,
        ]);
        console.log(`reset ${s.username} (${s.roles[0]})`);
      }
    }
  } finally {
    await app.close();
  }
}
bootstrap();
