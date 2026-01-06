import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DealStatus,
  DealType,
  UnitStatus,
  UnitType,
} from '@prisma/client';

export interface SalesReportFilters {
  from?: Date;
  to?: Date;
}

export interface SalesReportResponse {
  totalDeals: number;
  totalRevenue: number;
  byUnitType: {
    type: UnitType;
    dealsCount: number;
    revenue: number;
  }[];
  byDealType: {
    type: DealType;
    dealsCount: number;
    revenue: number;
  }[];
  byManager: {
    managerId: string;
    managerName: string;
    dealsCount: number;
    revenue: number;
  }[];
}

export type UnitsByStatus = { [K in UnitStatus]: number };

export interface DashboardSummary {
  totalUnits: number;
  totalDeals: number;
  totalRevenue: number;
  unitsByStatus: UnitsByStatus;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Отчёт по продажам (для страницы "Отчёты")
   */
  async getSalesReport(
    filters: SalesReportFilters,
  ): Promise<SalesReportResponse> {
    const where: any = {
      status: DealStatus.COMPLETED,
    };

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    const deals = await this.prisma.deal.findMany({
      where,
      include: {
        unit: true,
        manager: true,
      },
    });

    const totalDeals = deals.length;
    let totalRevenue = 0;

    const byUnitTypeMap = new Map<
      UnitType,
      { dealsCount: number; revenue: number }
    >();
    const byDealTypeMap = new Map<
      DealType,
      { dealsCount: number; revenue: number }
    >();
    const byManagerMap = new Map<
      string,
      {
        managerId: string;
        managerName: string;
        dealsCount: number;
        revenue: number;
      }
    >();

    for (const deal of deals) {
      const unitType = deal.unit?.type ?? UnitType.APARTMENT;
      const revenue = Number(deal.unit?.price ?? 0);

      totalRevenue += revenue;

      // по типу недвижимости
      const ut =
        byUnitTypeMap.get(unitType) ?? { dealsCount: 0, revenue: 0 };
      ut.dealsCount += 1;
      ut.revenue += revenue;
      byUnitTypeMap.set(unitType, ut);

      // по типу сделки
      const dt =
        byDealTypeMap.get(deal.type) ?? { dealsCount: 0, revenue: 0 };
      dt.dealsCount += 1;
      dt.revenue += revenue;
      byDealTypeMap.set(deal.type, dt);

      // по менеджерам
      const managerId = deal.managerId;
      const managerName = deal.manager?.fullName ?? 'Без менеджера';

      const m =
        byManagerMap.get(managerId) ??
        {
          managerId,
          managerName,
          dealsCount: 0,
          revenue: 0,
        };

      m.dealsCount += 1;
      m.revenue += revenue;
      byManagerMap.set(managerId, m);
    }

    return {
      totalDeals,
      totalRevenue,
      byUnitType: Array.from(byUnitTypeMap, ([type, v]) => ({
        type,
        ...v,
      })),
      byDealType: Array.from(byDealTypeMap, ([type, v]) => ({
        type,
        ...v,
      })),
      byManager: Array.from(byManagerMap.values()),
    };
  }

  /**
   * Сводка для Dashboard
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const [units, completedDeals] = await this.prisma.$transaction([
      this.prisma.unit.findMany(),
      this.prisma.deal.findMany({
        where: { status: DealStatus.COMPLETED },
        include: { unit: true },
      }),
    ]);

    const unitsByStatus: UnitsByStatus = {
      [UnitStatus.FREE]: 0,
      [UnitStatus.RESERVED]: 0,
      [UnitStatus.SOLD]: 0,
      [UnitStatus.INSTALLMENT]: 0,
      [UnitStatus.EQUITY]: 0,
    };

    for (const u of units) {
      unitsByStatus[u.status]++;
    }

    const totalUnits = units.length;
    const totalDeals = completedDeals.length;

    let totalRevenue = 0;
    for (const d of completedDeals) {
      totalRevenue += Number(d.unit?.price ?? 0);
    }

    return {
      totalUnits,
      totalDeals,
      totalRevenue,
      unitsByStatus,
    };
  }
}
