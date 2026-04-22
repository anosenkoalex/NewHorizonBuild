// backend/src/payments/payments.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Получить все платежи по сделке.
   */
  @Get('by-deal/:dealId')
  @Roles(
    UserRole.ADMIN,
    UserRole.SALES_HEAD,
    UserRole.MANAGER,
    UserRole.LEGAL,
  )
  async findByDeal(@Param('dealId') dealId: string) {
    return this.paymentsService.findByDeal(dealId);
  }

  /**
   * Создать платёж по сделке.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.MANAGER)
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  /**
   * Обновить платёж (дата, сумма, статус, комментарий).
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(id, dto);
  }
}
