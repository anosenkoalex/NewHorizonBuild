// backend/src/deals/deals.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DealsService } from './deals.service.js';
import { CreateDealDto } from './dto/create-deal.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { UpdateDealStatusDto } from './dto/update-deal-status.dto.js';
import { CreateDealCommentDto } from './dto/create-deal-comment.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  // Список сделок для таблицы
  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.SALES_HEAD,
    UserRole.MANAGER,
    UserRole.LEGAL,
  )
  async findAll() {
    return this.dealsService.findAll();
  }

  // Создание сделки
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.MANAGER)
  async create(@Body() dto: CreateDealDto, @Req() req: any) {
    const userId = req.user?.userId as string | undefined;

    if (!userId) {
      throw new UnauthorizedException('Не удалось определить пользователя');
    }

    return this.dealsService.create(dto, userId);
  }

  // Обновление статуса сделки
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.MANAGER)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDealStatusDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId as string | undefined;

    if (!userId) {
      throw new UnauthorizedException('Не удалось определить пользователя');
    }

    return this.dealsService.updateStatus(
      id,
      dto.status,
      userId,
      dto.comment,
    );
  }

  // История статусов по сделке
  @Get(':id/status-history')
  @Roles(
    UserRole.ADMIN,
    UserRole.SALES_HEAD,
    UserRole.MANAGER,
    UserRole.LEGAL,
  )
  async getStatusHistory(@Param('id') id: string) {
    return this.dealsService.getStatusHistoryByDeal(id);
  }

  // Комментарии по сделке
  @Get(':id/comments')
  @Roles(
    UserRole.ADMIN,
    UserRole.SALES_HEAD,
    UserRole.MANAGER,
    UserRole.LEGAL,
  )
  async getComments(@Param('id') id: string) {
    return this.dealsService.getCommentsByDeal(id);
  }

  // Добавление комментария по сделке
  @Post(':id/comments')
  @Roles(
    UserRole.ADMIN,
    UserRole.SALES_HEAD,
    UserRole.MANAGER,
    UserRole.LEGAL,
  )
  async createComment(
    @Param('id') id: string,
    @Body() dto: CreateDealCommentDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId as string | undefined;

    if (!userId) {
      throw new UnauthorizedException('Не удалось определить пользователя');
    }

    return this.dealsService.createCommentForDeal(
      id,
      dto.text,
      userId,
    );
  }

  // Список платежей по сделке
  // GET /deals/:id/payments
  @Get(':id/payments')
  @Roles(
    UserRole.ADMIN,
    UserRole.SALES_HEAD,
    UserRole.MANAGER,
    UserRole.LEGAL,
  )
  async getPayments(@Param('id') id: string) {
    return this.dealsService.getPaymentsByDeal(id);
  }

  // Создание платежа по сделке
  // POST /deals/:id/payments
  @Post(':id/payments')
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.MANAGER)
  async createPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.dealsService.createPaymentForDeal(id, dto);
  }

  // Обновление платежа (например, отметить как "оплачен")
  // PATCH /deals/:dealId/payments/:paymentId
  @Patch(':dealId/payments/:paymentId')
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD, UserRole.MANAGER)
  async updatePayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.dealsService.updatePayment(paymentId, dto);
  }

  // Получение одной сделки по id
  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.SALES_HEAD,
    UserRole.MANAGER,
    UserRole.LEGAL,
  )
  async findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }
}