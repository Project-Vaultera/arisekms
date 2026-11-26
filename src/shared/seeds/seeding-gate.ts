// Seeding policy shared by every seed script.
//
// The seed scripts are compiled into the production image (`dist/src/seed-*.js`
// plus the `*:prod` npm scripts), so "refuse when APP_ENV=production" is not a
// usable policy: testers need demo data on the live deployment. Instead,
// production seeding takes two explicit opt-ins — SEED_ALLOW_PRODUCTION=1 and a
// per-seeder password from the environment — so a live deployment is never
// seeded by accident, and never with a password committed to the repository.
//
// `staging` sits outside that gate on purpose. It is the environment for a
// tester-facing deployment that should be seedable with one command and no
// flags, so `seed:all:prod` runs there unguarded and falls back to the
// development passwords. That is the trade: a staging box is still publicly
// reachable, so never put real member data behind it.

export const SEED_ALLOW_PRODUCTION = 'SEED_ALLOW_PRODUCTION';

// A seeded account is only as safe as its password, so production refuses
// anything short. The development defaults are 10 and 12 characters long.
export const MIN_PRODUCTION_PASSWORD_LENGTH = 12;

export class SeedingRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedingRefusedError';
  }
}

function read(env: NodeJS.ProcessEnv, key: string): string {
  return (env[key] ?? '').trim();
}

export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return read(env, 'APP_ENV') === 'production';
}

/**
 * Throws unless seeding may run in the current environment. Development,
 * test and staging always pass; production needs the flag *and* a usable
 * password.
 */
export function assertSeedingAllowed(
  kind: string,
  passwordEnvVar: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!isProduction(env)) {
    return;
  }

  if (read(env, SEED_ALLOW_PRODUCTION) !== '1') {
    throw new SeedingRefusedError(
      `${kind} refuses to run with APP_ENV=production.\n` +
        `If this deployment should be seeded on purpose, pass ` +
        `${SEED_ALLOW_PRODUCTION}=1 and ${passwordEnvVar} ` +
        `(>= ${MIN_PRODUCTION_PASSWORD_LENGTH} chars).`,
    );
  }

  const password = read(env, passwordEnvVar);
  if (!password) {
    throw new SeedingRefusedError(
      `${kind}: ${passwordEnvVar} must be set when APP_ENV=production ` +
        `(the development default password is never used on a live deployment).`,
    );
  }
  if (password.length < MIN_PRODUCTION_PASSWORD_LENGTH) {
    throw new SeedingRefusedError(
      `${kind}: ${passwordEnvVar} must be at least ` +
        `${MIN_PRODUCTION_PASSWORD_LENGTH} characters when APP_ENV=production.`,
    );
  }
}

/**
 * An explicit environment password wins. The development default is only a
 * fallback outside production; production throws instead of using it.
 */
export function resolveSeedPassword(
  passwordEnvVar: string,
  devFallback: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const provided = read(env, passwordEnvVar);
  if (provided) {
    return provided;
  }
  if (isProduction(env)) {
    throw new SeedingRefusedError(
      `${passwordEnvVar} must be set when APP_ENV=production.`,
    );
  }
  return devFallback;
}

/**
 * `SEED_ROLES_ONLY="arisemember, ariseanalyst"` -> `['arisemember',
 * 'ariseanalyst']`. Undefined when unset or empty, i.e. "seed every account".
 */
export function parseSeedOnly(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const names = value
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return names.length ? Array.from(new Set(names)) : undefined;
}

/**
 * Report a refusal and set a failing exit code. Returns true when handled, so
 * callers can `if (handleSeedRefusal(error)) return;`.
 */
export function handleSeedRefusal(error: unknown): boolean {
  if (!(error instanceof SeedingRefusedError)) {
    return false;
  }
  console.error(error.message);
  process.exitCode = 1;
  return true;
}
