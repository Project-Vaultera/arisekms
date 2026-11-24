import {
  assertSeedingAllowed,
  handleSeedRefusal,
  isProduction,
  MIN_PRODUCTION_PASSWORD_LENGTH,
  parseSeedOnly,
  resolveSeedPassword,
  SEED_ALLOW_PRODUCTION,
  SeedingRefusedError,
} from './seeding-gate';

const PASSWORD_ENV = 'SEED_DEMO_PASSWORD';
const DEV_PASSWORD = 'DemoPass123!';
const PROD_PASSWORD = 'a-long-enough-seed-password';

function prodEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { APP_ENV: 'production', ...extra };
}

describe('seeding gate', () => {
  describe('isProduction', () => {
    it('is false by default and for development/test', () => {
      expect(isProduction({})).toBe(false);
      expect(isProduction({ APP_ENV: 'development' })).toBe(false);
      expect(isProduction({ APP_ENV: 'test' })).toBe(false);
    });

    it('is true for production, tolerating whitespace', () => {
      expect(isProduction({ APP_ENV: 'production' })).toBe(true);
      expect(isProduction({ APP_ENV: ' production ' })).toBe(true);
    });
  });

  describe('assertSeedingAllowed', () => {
    it('allows seeding outside production without any opt-in', () => {
      expect(() =>
        assertSeedingAllowed('seed:demo', PASSWORD_ENV, {}),
      ).not.toThrow();
      expect(() =>
        assertSeedingAllowed('seed:demo', PASSWORD_ENV, { APP_ENV: 'test' }),
      ).not.toThrow();
    });

    it('refuses production without the opt-in flag', () => {
      expect(() =>
        assertSeedingAllowed('seed:demo', PASSWORD_ENV, prodEnv()),
      ).toThrow(SeedingRefusedError);
      expect(() =>
        assertSeedingAllowed('seed:demo', PASSWORD_ENV, prodEnv()),
      ).toThrow(new RegExp(SEED_ALLOW_PRODUCTION));
    });

    it('only accepts `1` as the opt-in flag', () => {
      for (const value of ['true', 'yes', '0', '']) {
        expect(() =>
          assertSeedingAllowed(
            'seed:demo',
            PASSWORD_ENV,
            prodEnv({ [SEED_ALLOW_PRODUCTION]: value }),
          ),
        ).toThrow(SeedingRefusedError);
      }
    });

    it('refuses production when the password is missing', () => {
      expect(() =>
        assertSeedingAllowed(
          'seed:demo',
          PASSWORD_ENV,
          prodEnv({ [SEED_ALLOW_PRODUCTION]: '1' }),
        ),
      ).toThrow(new RegExp(PASSWORD_ENV));
    });

    it('refuses a production password shorter than the minimum', () => {
      expect(() =>
        assertSeedingAllowed(
          'seed:demo',
          PASSWORD_ENV,
          prodEnv({
            [SEED_ALLOW_PRODUCTION]: '1',
            [PASSWORD_ENV]: 'x'.repeat(MIN_PRODUCTION_PASSWORD_LENGTH - 1),
          }),
        ),
      ).toThrow(SeedingRefusedError);
    });

    it('allows production with the flag and a long enough password', () => {
      expect(() =>
        assertSeedingAllowed(
          'seed:demo',
          PASSWORD_ENV,
          prodEnv({
            [SEED_ALLOW_PRODUCTION]: '1',
            [PASSWORD_ENV]: PROD_PASSWORD,
          }),
        ),
      ).not.toThrow();
    });
  });

  describe('resolveSeedPassword', () => {
    it('prefers the environment password', () => {
      expect(
        resolveSeedPassword(PASSWORD_ENV, DEV_PASSWORD, {
          [PASSWORD_ENV]: ' from-env ',
        }),
      ).toBe('from-env');
    });

    it('falls back to the development default outside production', () => {
      expect(resolveSeedPassword(PASSWORD_ENV, DEV_PASSWORD, {})).toBe(
        DEV_PASSWORD,
      );
    });

    it('never falls back in production', () => {
      expect(() =>
        resolveSeedPassword(PASSWORD_ENV, DEV_PASSWORD, prodEnv()),
      ).toThrow(SeedingRefusedError);
    });
  });

  describe('parseSeedOnly', () => {
    it('returns undefined when unset or blank', () => {
      expect(parseSeedOnly(undefined)).toBeUndefined();
      expect(parseSeedOnly('')).toBeUndefined();
      expect(parseSeedOnly(' , ,')).toBeUndefined();
    });

    it('trims, lowercases, and de-duplicates', () => {
      expect(parseSeedOnly(' AriseMember , ariseanalyst,ARISEMEMBER ')).toEqual(
        ['arisemember', 'ariseanalyst'],
      );
    });
  });

  describe('handleSeedRefusal', () => {
    afterEach(() => {
      process.exitCode = undefined;
    });

    it('reports a refusal and marks the run failed', () => {
      const error = jest.spyOn(console, 'error').mockImplementation();
      try {
        expect(handleSeedRefusal(new SeedingRefusedError('nope'))).toBe(true);
        expect(process.exitCode).toBe(1);
        expect(error).toHaveBeenCalledWith('nope');
      } finally {
        error.mockRestore();
      }
    });

    it('ignores unrelated errors so they still crash the run', () => {
      expect(handleSeedRefusal(new Error('boom'))).toBe(false);
      expect(process.exitCode).toBeUndefined();
    });
  });
});
