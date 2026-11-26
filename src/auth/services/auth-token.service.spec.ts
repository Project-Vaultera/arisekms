import { AuthToken } from '../entities/auth-token.entity';
import { AuthTokenService } from './auth-token.service';

// In-memory stand-in for the repository. `query` reimplements only the one
// UPDATE the service issues, including its guards, so the single-use rule is
// actually exercised rather than assumed.
class FakeRepository {
  rows: Array<Partial<AuthToken>> = [];
  private seq = 0;

  create(patch: Partial<AuthToken>): Partial<AuthToken> {
    return { ...patch, id: `t${++this.seq}`, createdAt: new Date() };
  }

  async save(row: Partial<AuthToken>): Promise<Partial<AuthToken>> {
    this.rows.push(row);
    return row;
  }

  // Mirrors TypeORM: query() for a RETURNING statement yields [rows, affected].
  async query(_sql: string, params: unknown[]): Promise<unknown[]> {
    const [tokenHash, kind, userId] = params as [string, string, number | null];
    const row = this.rows.find(
      (r) =>
        r.tokenHash === tokenHash &&
        r.kind === kind &&
        !r.usedAt &&
        r.expiresAt instanceof Date &&
        r.expiresAt.getTime() > Date.now() &&
        (userId == null || r.userId === userId),
    );
    if (!row) return [[], 0];
    row.usedAt = new Date();
    return [[{ ...row, user_id: row.userId }], 1];
  }

  async delete(criteria: Record<string, unknown>): Promise<void> {
    this.rows = this.rows.filter((r) => {
      if (criteria.userId !== undefined && r.userId !== criteria.userId) return true;
      if (criteria.kind !== undefined && r.kind !== criteria.kind) return true;
      if (criteria.usedAt === null && r.usedAt) return true;
      // Only expired rows go when an expiry bound is present.
      if ('expiresAt' in criteria) {
        const bound = (criteria.expiresAt as { _value: Date })._value;
        return !(r.expiresAt && r.expiresAt.getTime() < bound.getTime());
      }
      return false;
    });
  }

  async find(opts: { where: Record<string, unknown> }): Promise<Partial<AuthToken>[]> {
    return this.rows.filter(
      (r) => r.userId === opts.where.userId && r.kind === opts.where.kind,
    );
  }

  async remove(rows: Partial<AuthToken>[]): Promise<void> {
    this.rows = this.rows.filter((r) => !rows.includes(r));
  }
}

function build() {
  const repo = new FakeRepository();
  const service = new AuthTokenService(repo as never);
  return { repo, service };
}

describe('AuthTokenService', () => {
  it('issues a raw token but stores only its hash', async () => {
    const { repo, service } = build();
    const raw = await service.issue(1, 'password_reset', 60_000);

    expect(raw).toHaveLength(43); // 32 bytes base64url
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].tokenHash).toHaveLength(64);
    expect(repo.rows[0].tokenHash).not.toBe(raw);
  });

  it('consumes once and refuses a replay', async () => {
    const { service } = build();
    const raw = await service.issue(1, 'password_reset', 60_000);

    expect(await service.consume(raw, 'password_reset')).not.toBeNull();
    expect(await service.consume(raw, 'password_reset')).toBeNull();
  });

  it('refuses an expired token', async () => {
    const { repo, service } = build();
    const raw = await service.issue(1, 'password_reset', 1);
    repo.rows[0].expiresAt = new Date(Date.now() - 1000);

    expect(await service.consume(raw, 'password_reset')).toBeNull();
  });

  it('refuses the wrong kind', async () => {
    const { service } = build();
    const raw = await service.issue(1, 'invite', 60_000);

    expect(await service.consume(raw, 'password_reset')).toBeNull();
  });

  it('refuses another user', async () => {
    const { service } = build();
    const raw = await service.issue(1, 'password_reset', 60_000);

    expect(await service.consume(raw, 'password_reset', 2)).toBeNull();
  });

  it('consumes without a user id, as the reset endpoint does', async () => {
    const { service } = build();
    const raw = await service.issue(7, 'password_reset', 60_000);

    const row = await service.consumeWithoutUser(raw, 'password_reset');
    expect(row?.userId).toBe(7);
  });

  it('kills siblings once one token is used', async () => {
    const { service } = build();
    const first = await service.issue(1, 'password_reset', 60_000);
    const second = await service.issue(1, 'password_reset', 60_000);

    await service.consume(second, 'password_reset');
    expect(await service.consume(first, 'password_reset', 1)).toBeNull();
  });

  it('caps open tokens per user and kind', async () => {
    const { repo, service } = build();
    for (let i = 0; i < 8; i += 1) {
      await service.issue(1, 'password_reset', 60_000);
    }

    expect(repo.rows.length).toBeLessThanOrEqual(5);
  });
});