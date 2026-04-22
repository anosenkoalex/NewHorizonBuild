import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.SALES_HEAD,
    UserRole.MANAGER,
    UserRole.LEGAL,
  )
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.SALES_HEAD,
    UserRole.MANAGER,
    UserRole.LEGAL,
  )
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.MANAGER)
  create(
    @Body()
    body: { fullName: string; phone: string; email?: string | null },
  ) {
    return this.clientsService.create(body);
  }
}