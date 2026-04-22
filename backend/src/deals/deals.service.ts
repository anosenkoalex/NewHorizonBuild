// backend/src/deals/deals.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDealDto } from './dto/create-deal.dto.js';
import {
  DealStatus,
  DealType,
  PaymentStatus,
  Prisma,
  UnitStatus,
  UserRole,
} from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly dealInclude = {
    unit: true,
    client: true,
    manager: true,
  } as const;

  private readonly dealDetailsInclude = {
    unit: true,
    client: true,
    manager: true,
    comments: {
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    },
    statusHistory: {
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    },
  } as const;

  private parseDate(value: string, fieldName: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }

  private resolveCompletedUnitStatus(type: DealType): UnitStatus {
    switch (type) {
      case DealType.SALE:
        return UnitStatus.SOLD;
      case DealType.INSTALLMENT:
        return UnitStatus.INSTALLMENT;
      case DealType.EQUITY:
        return UnitStatus.EQUITY;
      default:
        return UnitStatus.SOLD;
    }
  }

  private resolveUnitStatusForDeal(
    type: DealType,
    status: DealStatus,
  ): UnitStatus {
    if (status === DealStatus.COMPLETED) {
      return this.resolveCompletedUnitStatus(type);
    }

    if (
      status === DealStatus.CANCELED ||
      status === DealStatus.DRAFT
    ) {
      return UnitStatus.FREE;
    }

    return UnitStatus.RESERVED;
  }

  private async ensureDealExists(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    return deal;
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Список сделок для таблицы
  async findAll() {
    return this.prisma.deal.findMany({
      orderBy: { createdAt: 'desc' },
      include: this.dealInclude,
    });
  }

  // Одна сделка по id
  async findOne(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: this.dealDetailsInclude,
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    return deal;
  }

  // Создание сделки
  async create(
    dto: CreateDealDto,
    createdByUserId?: string | null,
  ) {
    const { unitId, clientFullName, clientPhone, type, status } = dto;

    // Проверяем юнит
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.status !== UnitStatus.FREE) {
      throw new BadRequestException(
        'Unit is not available for creating a new deal',
      );
    }

    let managerId: string | null = null;

    if (createdByUserId) {
      const currentUser = await this.ensureUserExists(createdByUserId);
      managerId = currentUser.id;
    } else {
      // fallback: если сервис вызвали без userId
      const fallbackManager =
        (await this.prisma.user.findFirst({
          where: { role: UserRole.MANAGER },
        })) ||
        (await this.prisma.user.findFirst({
          where: { role: UserRole.ADMIN },
        }));

      if (!fallbackManager) {
        throw new NotFoundException(
          'Manager user not found (no MANAGER/ADMIN user in DB)',
        );
      }

      managerId = fallbackManager.id;
    }

    const newUnitStatus = this.resolveUnitStatusForDeal(type, status);

    // Транзакция: клиент + сделка + история + обновление статуса юнита
    const deal = await this.prisma.$transaction(async (tx) => {
      // Ищем клиента по телефону
      let client = await tx.client.findFirst({
        where: { phone: clientPhone },
      });

      // Если есть — при необходимости обновляем имя
      if (client) {
        if (client.fullName !== clientFullName) {
          client = await tx.client.update({
            where: { id: client.id },
            data: { fullName: clientFullName },
          });
        }
      } else {
        // Если нет — создаём
        client = await tx.client.create({
          data: {
            fullName: clientFullName,
            phone: clientPhone,
          },
        });
      }

      const createdDeal = await tx.deal.create({
        data: {
          unitId: unit.id,
          clientId: client.id,
          managerId,
          type,
          status,
        },
        include: this.dealInclude,
      });

      await tx.dealStatusHistory.create({
        data: {
          dealId: createdDeal.id,
          fromStatus: null,
          toStatus: status,
          changedByUserId: createdByUserId ?? null,
        },
      });

      if (newUnitStatus !== unit.status) {
        await tx.unit.update({
          where: { id: unit.id },
          data: { status: newUnitStatus },
        });
      }

      return createdDeal;
    });

    return deal;
  }

  // Обновление статуса сделки и, при необходимости, статуса юнита
  async updateStatus(
    id: string,
    status: DealStatus,
    changedByUserId?: string | null,
    comment?: string | null,
  ) {
    const existingDeal = await this.prisma.deal.findUnique({
      where: { id },
      include: this.dealInclude,
    });

    if (!existingDeal) {
      throw new NotFoundException('Deal not found');
    }

    if (changedByUserId) {
      await this.ensureUserExists(changedByUserId);
    }

    if (existingDeal.status === status) {
      return existingDeal;
    }

    const trimmedComment =
      typeof comment === 'string' ? comment.trim() : '';

    const newUnitStatus = this.resolveUnitStatusForDeal(
      existingDeal.type,
      status,
    );

    const updatedDeal = await this.prisma.$transaction(async (tx) => {
      const deal = await tx.deal.update({
        where: { id },
        data: { status },
        include: this.dealInclude,
      });

      await tx.dealStatusHistory.create({
        data: {
          dealId: id,
          fromStatus: existingDeal.status,
          toStatus: status,
          changedByUserId: changedByUserId ?? null,
          comment: trimmedComment || null,
        },
      });

      if (newUnitStatus !== existingDeal.unit.status) {
        await tx.unit.update({
          where: { id: existingDeal.unitId },
          data: { status: newUnitStatus },
        });
      }

      return deal;
    });

    return updatedDeal;
  }

  // История изменения статусов по сделке
  async getStatusHistoryByDeal(dealId: string) {
    await this.ensureDealExists(dealId);

    return this.prisma.dealStatusHistory.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  // Комментарии по сделке
  async getCommentsByDeal(dealId: string) {
    await this.ensureDealExists(dealId);

    return this.prisma.dealComment.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  // Создание комментария по сделке
  async createCommentForDeal(
    dealId: string,
    text: string,
    authorUserId?: string | null,
  ) {
    await this.ensureDealExists(dealId);

    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new BadRequestException('Comment text is required');
    }

    if (authorUserId) {
      await this.ensureUserExists(authorUserId);
    }

    return this.prisma.dealComment.create({
      data: {
        dealId,
        text: trimmedText,
        authorUserId: authorUserId ?? null,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  // --- ПЛАТЕЖИ ---

  // Список платежей по сделке
  async getPaymentsByDeal(dealId: string) {
    await this.ensureDealExists(dealId);

    return this.prisma.payment.findMany({
      where: { dealId },
      orderBy: { dueDate: 'asc' },
    });
  }

  // Создание платежа по сделке
  async createPaymentForDeal(dealId: string, dto: CreatePaymentDto) {
    await this.ensureDealExists(dealId);

    const { dueDate, amount, comment } = dto;

    const payment = await this.prisma.payment.create({
      data: {
        dealId,
        dueDate: this.parseDate(dueDate, 'dueDate'),
        amount,
        status: PaymentStatus.PLANNED,
        comment: comment || null,
      },
    });

    return payment;
  }

  // Обновление платежа (изм. даты, суммы, статуса, paidAt, комментария)
  async updatePayment(paymentId: string, dto: UpdatePaymentDto) {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!existingPayment) {
      throw new NotFoundException('Payment not found');
    }

    const data: Prisma.PaymentUpdateInput = {};

    if (dto.dueDate !== undefined) {
      data.dueDate = this.parseDate(dto.dueDate, 'dueDate');
    }

    if (dto.amount !== undefined) {
      data.amount = dto.amount;
    }

    if (dto.comment !== undefined) {
      data.comment = dto.comment;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.paidAt !== undefined) {
      data.paidAt = dto.paidAt
        ? this.parseDate(dto.paidAt, 'paidAt')
        : null;
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data,
    });

    return updated;
  }
}