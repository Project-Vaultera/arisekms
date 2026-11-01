import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { normalizeRoles,ROLE } from '../constants/role.constant';
import { ROLES_KEY } from '../decorators/role.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<ROLE[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new UnauthorizedException();
    }
    const userRoles = normalizeRoles(user.roles ?? []);

    if (requiredRoles.map(String).some((role) => userRoles.includes(role))) {
      return true;
    }

    throw new ForbiddenException(
      `User with roles ${user?.roles} does not have access to this route with roles ${requiredRoles}`,
    );
  }
}
