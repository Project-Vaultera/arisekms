import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';

import { STRATEGY_JWT_REFRESH } from '../constants/strategy.constant';
import { UserRefreshTokenClaims } from '../dtos/auth-token-output.dto';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  STRATEGY_JWT_REFRESH,
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: configService.getOrThrow<string>('jwt.publicKey'),
      algorithms: ['RS256'],
    });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async validate(payload: any): Promise<UserRefreshTokenClaims> {
    const row = await this.dataSource.query(
      `SELECT id, "isAccountDisabled", "tokenVersion" FROM users WHERE id = $1`,
      [payload.sub],
    );
    const user = row?.[0];
    if (!user || user.isAccountDisabled) {
      throw new UnauthorizedException();
    }
    if (payload.tokenVersion !== undefined && Number(payload.tokenVersion) !== Number(user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Session revoked');
    }
    return { id: payload.sub };
  }
}
