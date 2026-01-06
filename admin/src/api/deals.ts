// admin/src/api/deals.ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface DealUnit {
  id: string;
  number: string | null;
  type: string; // APARTMENT / COMMERCIAL / PARKING
}

export interface DealClient {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
}

export interface DealManager {
  id: string;
  fullName: string;
  email: string;
}

export interface Deal {
  id: string;
  type: string;   // DealType
  status: string; // DealStatus
  createdAt: string;
  updatedAt: string;
  unit?: DealUnit | null;
  client?: DealClient | null;
  manager?: DealManager | null;
}

export interface FetchDealsOptions {
  type?: string;   // SALE / INSTALLMENT / EQUITY
  status?: string; // DRAFT / ACTIVE / COMPLETED / CANCELED
  from?: string;   // ISO date, если когда-нибудь добавим фильтр по датам
  to?: string;
}

export interface CreateDealPayload {
  unitId: string;
  clientFullName: string;
  clientPhone: string;
  type: string;
  status: string;
}

// общий хелпер для заголовков
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchDeals(
  options: FetchDealsOptions = {},
): Promise<Deal[]> {
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.status) params.set('status', options.status);
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);

  const query = params.toString();
  const url = `${API_URL}/deals${query ? `?${query}` : ''}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Не удалось загрузить сделки');
  }

  return res.json();
}

export async function createDeal(
  payload: CreateDealPayload,
): Promise<Deal> {
  const res = await fetch(`${API_URL}/deals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ошибка при создании сделки: ${text}`);
  }

  return res.json();
}
