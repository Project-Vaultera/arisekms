import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { LessThan, Repository } from 'typeorm';

import { AuthToken, AuthTokenKind } from '../entities/auth-token.entity';

// Cap per user and kind so repeated requests cannot grow the table.
const MAX_OPEN_TOKENS = 5;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class AuthTokenService {
  constructor(
    @InjectRepository(AuthToken)
    private readonly repository: Repository<AuthToken>,
  ) {}

  /**
   * Mints a token and returns the RAW value, which is the only time it can be
   * read: only the hash is persisted.
   */
  async issue(
    userId: number,
    kind: AuthTokenKind,
    ttlMs: number,
    createdBy: number | null = null,
  ): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    await this.repository.save(
      this.repository.create({
        userId,
        kind,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + ttlMs),
        usedAt: null,
        createdBy,
      }),
    );
    await this.prune(userId, kind);
    return raw;
  }

  /**
   * Consumes a token, or returns null when it is unknown, of the wrong kind,
   * expired, already used, or belongs to a different user.
   *
   * The claim is one UPDATE ... RETURNING guarded on used_at/expiry, so two
   * concurrent clicks cannot both succeed.
   */
  // `userId` is optional: the reset endpoint only has the token and takes the
  // owner from the row, while invite accept checks against a known user.
  async consume(
    raw: string,
    kind: AuthTokenKind,
    userId?: number,
  ): Promise<AuthToken | null> {
    const tokenHash = hashToken(raw);
    const claimed = await this.repository.query(
      `UPDATE auth_tokens
          SET used_at = now()
        WHERE token_hash = $1
          AND kind = $2
          AND used_at IS NULL
          AND expires_at > now()
        RETURNING *`,
      [tokenHash, kind],
    );
    // TypeORM's query() returns [rows, affected] for a RETURNING statement.
    const rows = Array.isArray(claimed?.[0]) ? claimed[0] : claimed;
    const row = rows?.[0];
    if (!row || (userId !== undefined && row.user_id !== userId)) {
      return null;
    }
    // Kill siblings: an older link stops working once one is used.
    await this.repository.delete({
      userId: row.user_id,
      kind,
      usedAt: null,
    } as never);
    return { ...row, userId: row.user_id } as AuthToken;
  }

  // Alias: the reset endpoint has no user id up front, the row supplies it.
  async consumeWithoutUser(
    raw: string,
    kind: AuthTokenKind,
  ): Promise<AuthToken | null> {
    return this.consume(raw, kind);
  }

  // Drop expired rows, then the oldest survivors beyond the cap.
  private async prune(userId: number, kind: AuthTokenKind): Promise<void> {
    await this.repository.delete({
      userId,
      kind,
      expiresAt: LessThan(new Date()),
    } as never);
    const open = await this.repository.find({
      where: { userId, kind, usedAt: null } as never,
      order: { createdAt: 'DESC' },
    });
    const surplus = open.slice(MAX_OPEN_TOKENS);
    if (surplus.length > 0) {
      await this.repository.remove(surplus);
    }
  }
}