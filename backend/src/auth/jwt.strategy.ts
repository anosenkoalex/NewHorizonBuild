// backend/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub?: string;      // возможный id
  id?: string;       // возможный id
  userId?: string;   // возможный id
  role?: UserRole;   // роль, если кладём её в токен
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    // Пытаемся вытащить какой-то userId из разных полей,
    // но если не получится — всё равно пускаем.
    const userId =
      payload.sub ??
      payload.id ??
      payload.userId ??
      'unknown';

    // То, что попадёт в request.user
    return {
      userId,
      role: payload.role ?? ('VIEWER' as UserRole),
    };
  }
}
