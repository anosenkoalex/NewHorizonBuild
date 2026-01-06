// backend/src/deals/dto/create-deal.dto.ts
import { DealStatus, DealType } from '@prisma/client';

export class CreateDealDto {
  // ID юнита, по которому создаётся сделка
  unitId!: string;

  // Новый или существующий клиент (по телефону будем искать/создавать)
  clientFullName!: string;
  clientPhone!: string;

  // Тип сделки: SALE / INSTALLMENT / EQUITY
  type!: DealType;

  // Статус сделки: DRAFT / ACTIVE / COMPLETED / CANCELED
  status!: DealStatus;
}
