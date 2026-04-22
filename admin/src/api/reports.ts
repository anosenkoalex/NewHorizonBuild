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

  // raw может быть в разных форматах (старый/новый бэк) — выдержим всё
  const raw = (await res.json()) as any;

  const byUnitType: SalesReport['byUnitType'] = {};
  const rawByUnitType = raw?.byUnitType;

  if (Array.isArray(rawByUnitType)) {
    // Новый формат: массив { type, dealsCount, revenue }
    for (const item of rawByUnitType) {
      if (!item) continue;
      const type = item.type as UnitType;
      byUnitType[type] = {
        count: Number(item.dealsCount ?? item.count ?? 0),
        revenue: Number(item.revenue ?? 0),
      };
    }
  } else if (rawByUnitType && typeof rawByUnitType === 'object') {
    // Старый формат: объект по ключам типа { APARTMENT: { dealsCount, revenue } }
    for (const [key, value] of Object.entries(rawByUnitType)) {
      if (!value) continue;
      const type = key as UnitType;
      const v = value as any;
      byUnitType[type] = {
        count: Number(v.dealsCount ?? v.count ?? 0),
        revenue: Number(v.revenue ?? 0),
      };
    }
  }

  const byDealType: SalesReport['byDealType'] = {};
  const rawByDealType = raw?.byDealType;

  if (Array.isArray(rawByDealType)) {
    // Новый формат: массив { type, dealsCount, revenue }
    for (const item of rawByDealType) {
      if (!item) continue;
      const type = item.type as DealType;
      byDealType[type] = {
        count: Number(item.dealsCount ?? item.count ?? 0),
        revenue: Number(item.revenue ?? 0),
      };
    }
  } else if (rawByDealType && typeof rawByDealType === 'object') {
    // Старый формат: объект по ключам типа { SALE: { dealsCount, revenue } }
    for (const [key, value] of Object.entries(rawByDealType)) {
      if (!value) continue;
      const type = key as DealType;
      const v = value as any;
      byDealType[type] = {
        count: Number(v.dealsCount ?? v.count ?? 0),
        revenue: Number(v.revenue ?? 0),
      };
    }
  }

  return {
    totalDeals: Number(raw.totalDeals ?? 0),
    totalRevenue: Number(raw.totalRevenue ?? 0),
    byUnitType,
    byDealType,
    byManager: Array.isArray(raw.byManager) ? raw.byManager : [],
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