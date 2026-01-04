import { DealStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesSummary(from?: Date, to?: Date) {
    const deals = await this.prisma.deal.findMany({
      where: {
        status: DealStatus.COMPLETED,
        createdAt: from || to ? { gte: from, lte: to } : undefined,
      },
      include: {
        unit: true,
      },
    });

    const totalDeals = deals.length;
    const totalRevenue = deals.reduce((sum, deal) => {
      const price = deal.unit?.price;
      return sum + (price ? Number(price) : 0);
    }, 0);

    return {
      totalDeals,
      totalRevenue,
    };
  }
}
