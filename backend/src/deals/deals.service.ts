// backend/src/deals/deals.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDealDto } from './dto/create-deal.dto.js';
import {
  DealStatus,
  DealType,
  UnitStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  // Список сделок для таблицы
  async findAll() {
    return this.prisma.deal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        unit: true,
        client: true,
        manager: true,
      },
    });
  }

  // Создание сделки
  async create(dto: CreateDealDto) {
    const { unitId, clientFullName, clientPhone, type, status } = dto;

    // Проверяем юнит
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // Ищем клиента по телефону
    let client = await this.prisma.client.findFirst({
      where: { phone: clientPhone },
    });

    // Если есть — при необходимости обновляем имя
    if (client) {
      if (client.fullName !== clientFullName) {
        client = await this.prisma.client.update({
          where: { id: client.id },
          data: { fullName: clientFullName },
        });
      }
    } else {
      // Если нет — создаём
      client = await this.prisma.client.create({
        data: {
          fullName: clientFullName,
          phone: clientPhone,
        },
      });
    }

    // Берём менеджера (сначала MANAGER, если нет — ADMIN)
    const manager =
      (await this.prisma.user.findFirst({
        where: { role: UserRole.MANAGER },
      })) ??
      (await this.prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
      }));

    if (!manager) {
      throw new NotFoundException(
        'Manager user not found (no MANAGER/ADMIN user in DB)',
      );
    }

    // Новый статус юнита в зависимости от типа сделки
    let newUnitStatus: UnitStatus | undefined;
    if (type === DealType.SALE || type === DealType.EQUITY) {
      newUnitStatus = UnitStatus.SOLD;
    } else if (type === DealType.INSTALLMENT) {
      newUnitStatus = UnitStatus.INSTALLMENT;
    }

    // Транзакция: создаём сделку + обновляем статус юнита
    const deal = await this.prisma.$transaction(async (tx) => {
      const createdDeal = await tx.deal.create({
        data: {
          unitId: unit.id,
          clientId: client.id,
          managerId: manager.id,
          type,
          status,
        },
        include: {
          unit: true,
          client: true,
          manager: true,
        },
      });

      if (newUnitStatus) {
        await tx.unit.update({
          where: { id: unit.id },
          data: { status: newUnitStatus },
        });
      }

      return createdDeal;
    });

    return deal;
  }
}
