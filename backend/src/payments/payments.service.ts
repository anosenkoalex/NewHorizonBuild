// backend/src/payments/payments.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateOrThrow(value: string, fieldName: string): Date {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Некорректная дата в поле ${fieldName}`);
    }
    return d;
  }

  async findByDeal(dealId: string) {
    // Проверим, что сделка существует
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: { id: true },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    return this.prisma.payment.findMany({
      where: { dealId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async create(dto: CreatePaymentDto) {
    const { dealId, dueDate, amount, status, comment } = dto;

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: { id: true },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    if (amount == null || Number.isNaN(Number(amount))) {
      throw new BadRequestException('Некорректная сумма платежа');
    }

    const dueDateObj = this.parseDateOrThrow(dueDate, 'dueDate');

    return this.prisma.payment.create({
      data: {
        dealId,
        dueDate: dueDateObj,
        amount: Number(amount),
        status: status ?? PaymentStatus.PLANNED,
        comment: comment ?? null,
      },
    });
  }

  async update(id: string, dto: UpdatePaymentDto) {
    const existing = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Payment not found');
    }

    const data: any = {};

    if (dto.dueDate !== undefined) {
      data.dueDate = this.parseDateOrThrow(dto.dueDate, 'dueDate');
    }

    if (dto.amount !== undefined) {
      if (dto.amount == null || Number.isNaN(Number(dto.amount))) {
        throw new BadRequestException('Некорректная сумма платежа');
      }
      data.amount = Number(dto.amount);
    }

    if (dto.comment !== undefined) {
      data.comment = dto.comment ?? null;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;

      // Простая логика по paidAt:
      if (dto.status === PaymentStatus.PAID) {
        if (!existing.paidAt) {
          data.paidAt = new Date();
        }
      } else {
        // Для PLANNED/OVERDUE считаем, что оплата не зафиксирована
        data.paidAt = null;
      }
    }

    return this.prisma.payment.update({
      where: { id },
      data,
    });
  }
}
