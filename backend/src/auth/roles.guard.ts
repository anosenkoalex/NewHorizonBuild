// backend/src/auth/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

type JwtPayloadLike = {
  sub?: string;
  id?: string;
  userId?: string;
  role?: UserRole;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  private getUserFromRequestOrToken(request: any): {
    role?: UserRole;
    email?: string;
    userId?: string;
  } | undefined {
    if (request.user) {
      return request.user;
    }

    const authHeader = request.headers?.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'dev-secret',
      ) as JwtPayloadLike;

      return {
        userId: decoded.sub ?? decoded.id ?? decoded.userId,
        role: decoded.role,
      };
    } catch {
      return undefined;
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = this.getUserFromRequestOrToken(request);

    console.log('ROLES DEBUG', {
      path: request.url,
      requiredRoles,
      user,
      authHeader: request.headers?.authorization ?? null,
    });

    if (!user || !user.role) {
      throw new ForbiddenException('Forbidden resource');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Forbidden resource');
    }

    return true;
  }
}