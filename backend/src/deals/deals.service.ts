import { DealStatus, DealType } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDealDto {
  unitId: string;
  clientId: string;
  managerId: string;
  type: DealType;
  status: DealStatus;
}

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.deal.findMany({
      include: {
        unit: true,
        client: true,
        manager: true,
      },
    });
  }

  create(dto: CreateDealDto) {
    return this.prisma.deal.create({ data: dto });
  }
}
