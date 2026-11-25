import { plainToClass } from 'class-transformer';
import { Request } from 'express';

import { UserAccessTokenClaims } from '../../../auth/dtos/auth-token-output.dto';
import { REQUEST_ID_TOKEN_HEADER } from '../../constants';
import { RequestContext } from '../request-context.dto';
import { resolveClientIp } from './client-ip';

// Creates a RequestContext object from Request
export function createRequestContext(request: Request): RequestContext {
  const ctx = new RequestContext();
  ctx.requestID = request.header(REQUEST_ID_TOKEN_HEADER);
  ctx.url = request.url;
  // Same helper the auth throttle keys on, so logs, audit and limits agree.
  ctx.ip = resolveClientIp(request);

  // If request.user does not exist, we explicitly set it to null.
  ctx.user = request.user
    ? plainToClass(UserAccessTokenClaims, request.user, {
        excludeExtraneousValues: true,
      })
    : null;

  return ctx;
}
