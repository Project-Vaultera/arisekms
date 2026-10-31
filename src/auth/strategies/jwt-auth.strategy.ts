import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';

import { STRATEGY_JWT_AUTH } from '../constants/strategy.constant';
import { UserAccessTokenClaims } from '../dtos/auth-token-output.dto';

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(
  Strategy,
  STRATEGY_JWT_AUTH,
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('jwt.publicKey'),
      algorithms: ['RS256'],
    });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async validate(payload: any): Promise<UserAccessTokenClaims> {
    // Fresh roles + disabled check: old tokens stop working after demote/disable.
    // Legacy tokens without tokenVersion still pass the disabled check.
    const row = await this.dataSource.query(
      `SELECT id, username, roles, "isAccountDisabled", "tokenVersion" FROM users WHERE id = $1`,
      [payload.sub],
    );
    const user = row?.[0];
    if (!user || user.isAccountDisabled) {
      throw new UnauthorizedException();
    }
    if (payload.tokenVersion !== undefined && Number(payload.tokenVersion) !== Number(user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Session revoked');
    }
    return {
      id: user.id,
      username: user.username,
      roles: Array.isArray(user.roles) ? user.roles : String(user.roles ?? '').split(',').filter(Boolean),
    };
  }
}
