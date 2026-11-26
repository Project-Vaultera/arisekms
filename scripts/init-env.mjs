#!/usr/bin/env node
// Fill secrets that an env template cannot carry, in place.
//
// Two values block a first run and are best supplied by a machine rather than a
// human: an RS256 keypair to sign JWTs, and a database password baked into the
// Postgres volume on first start.
//
// Stored inline in the file (base64 has no line breaks) so no .env parser can
// mangle them, and replaced on every run rather than appended, so re-running is
// safe.
//
//   node scripts/init-env.mjs .env
//
// The JWT pair must be RSA PEM: jwt-auth.strategy.ts forces RS256, which an
// HS256 secret does not satisfy.
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2] ?? '.env';

const CLASSES = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
];
const EXTRA = '!@#%^&*-_';
const LENGTH = 20;

// One character from every class, so it also clears the production seeder's
// 12-character minimum without a human choosing one.
function strongPassword() {
  const all = CLASSES.join('') + EXTRA;
  const chars = CLASSES.map((c) => c[randomBytes(1)[0] % c.length]);
  while (chars.length < LENGTH) {
    chars.push(all[randomBytes(1)[0] % all.length]);
  }
  // Shuffle, so the guaranteed classes are not a predictable prefix.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const b64 = (value) => Buffer.from(value, 'utf8').toString('base64');

let env = readFileSync(file, 'utf8');

const values = {
  JWT_PUBLIC_KEY_BASE64: b64(publicKey),
  JWT_PRIVATE_KEY_BASE64: b64(privateKey),
};

// Only fill an empty DB_PASS. A Postgres volume keeps the password it was
// initialised with, so rotating this on an existing volume is a login failure,
// and the volume outlives re-runs while the file may not.
if (!/^DB_PASS=.+$/m.test(env)) {
  values.DB_PASS = strongPassword();
}

for (const [key, value] of Object.entries(values)) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(env)) {
    env = env.replace(pattern, line);
  } else {
    env += `${env.endsWith('\n') ? '' : '\n'}${line}`;
  }
}

writeFileSync(file, env);

console.log(`Wrote to ${file}:`);
console.log('  JWT_PUBLIC_KEY_BASE64, JWT_PRIVATE_KEY_BASE64  fresh RS256 pair');
console.log(
  values.DB_PASS
    ? '  DB_PASS  fresh 20-char password'
    : '  DB_PASS  kept (already set)',
);
console.log(
  '\nIf you later change DB_PASS, an existing Postgres volume keeps the old ' +
    'one and the API fails to connect: run `docker compose down -v` once.',
);