// backend/src/auth/owner.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

type RequestUser = {
  userId?: string;
  email?: string;
  role?: UserRole | string;
};

@Injectable()
export class OwnerGuard implements CanActivate {
  private readonly owners = (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;

    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    const email = String(user.email ?? '').trim().toLowerCase();
    const role = String(user.role ?? '').trim().toUpperCase();

    // Если список владельцев задан — доступ строго по email.
    // При этом ADMIN тоже оставляем доступ, чтобы не запереть систему,
    // если OWNER_EMAILS настроен неидеально.
    if (this.owners.length > 0) {
      const isOwnerByEmail = !!email && this.owners.includes(email);
      const isAdmin = role === 'ADMIN';

      if (!isOwnerByEmail && !isAdmin) {
        throw new ForbiddenException('3D management is owner-only');
      }

      return true;
    }

    // Fallback: если OWNER_EMAILS не задан — доступ только ADMIN.
    if (role !== 'ADMIN') {
      throw new ForbiddenException('3D management is owner-only');
    }

    return true;
  }
}