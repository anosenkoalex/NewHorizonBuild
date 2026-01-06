// admin/src/api/reports.ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// тот же ключ, что в AuthContext
const STORAGE_TOKEN_KEY = 'nhb_token';

export type UnitType = 'APARTMENT' | 'COMMERCIAL' | 'PARKING';
export type DealType = 'SALE' | 'INSTALLMENT' | 'EQUITY';
export type UnitStatus =
  | 'FREE'
  | 'RESERVED'
  | 'SOLD'
  | 'INSTALLMENT'
  | 'EQUITY';

/**
 * То, что реально возвращает бэкенд (как в ReportsService)
 */
interface RawSalesReportResponse {
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

/**
 * Нормализованный тип для фронта — удобные объекты по ключу
 */
export interface SalesReport {
  totalDeals: number;
  totalRevenue: number;
  byUnitType: {
    [K in UnitType]?: {
      count: number;
      revenue: number;
    };
  };
  byDealType: {
    [K in DealType]?: {
      count: number;
      revenue: number;
    };
  };
  byManager: {
    managerId: string;
    managerName: string;
    dealsCount: number;
    revenue: number;
  }[];
}

export interface DashboardSummary {
  totalUnits: number;
  totalDeals: number;
  totalRevenue: number;
  unitsByStatus: { [K in UnitStatus]: number };
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchSalesReport(params: {
  from?: string;
  to?: string;
}): Promise<SalesReport> {
  const url = new URL(`${API_URL}/reports/sales`);
  if (params.from) url.searchParams.set('from', params.from);
  if (params.to) url.searchParams.set('to', params.to);

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Не удалось построить отчёт');
  }

  const raw: RawSalesReportResponse = await res.json();

  const byUnitType: SalesReport['byUnitType'] = {};
  for (const item of raw.byUnitType) {
    byUnitType[item.type] = {
      count: item.dealsCount,
      revenue: item.revenue,
    };
  }

  const byDealType: SalesReport['byDealType'] = {};
  for (const item of raw.byDealType) {
    byDealType[item.type] = {
      count: item.dealsCount,
      revenue: item.revenue,
    };
  }

  return {
    totalDeals: raw.totalDeals,
    totalRevenue: raw.totalRevenue,
    byUnitType,
    byDealType,
    byManager: raw.byManager,
  };
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_URL}/reports/dashboard`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Не удалось загрузить сводку для дашборда');
  }

  return res.json();
}
