// backend/src/users/users.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard) // все ручки тут только с валидным JWT
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD)
  findAll() {
    // вернёт id, email, fullName, role, createdAt
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD)
  updateRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
  ) {
    return this.usersService.updateRole(id, role);
  }
}
