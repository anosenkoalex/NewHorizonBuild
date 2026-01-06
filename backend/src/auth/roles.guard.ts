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

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Смотрим, есть ли вообще какие-то роли на хендлере/контроллере
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // ***Если ролей не задано — НИЧЕГО не ограничиваем, пропускаем всех.***
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: UserRole } | undefined;

    // Если на ручке роли есть, но пользователя нет — рубим
    if (!user || !user.role) {
      throw new ForbiddenException('Forbidden resource');
    }

    // Если пользователь есть, но его роль не в списке — тоже рубим
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Forbidden resource');
    }

    // Всё ок, доступ разрешён
    return true;
  }
}
