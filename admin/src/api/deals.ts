// admin/src/api/deals.ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// тот же ключ, что используется в AuthContext
const STORAGE_TOKEN_KEY = 'nhb_token';

export type DealType = 'SALE' | 'INSTALLMENT' | 'EQUITY';
export type DealStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';
export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES_HEAD'
  | 'LEGAL'
  | 'VIEWER';

export interface DealUnit {
  id: string;
  number: string | null;
  type: string; // APARTMENT / COMMERCIAL / PARKING
  price?: number | string | null;
  projectName?: string | null;
  buildingName?: string | null;
  sectionName?: string | null;
  floorNumber?: number | null;
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
  phone?: string | null;
}

export interface DealActor {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface DealComment {
  id: string;
  dealId: string;
  authorUserId?: string | null;
  author?: DealActor | null;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealStatusHistoryItem {
  id: string;
  dealId: string;
  fromStatus?: DealStatus | null;
  toStatus: DealStatus;
  changedByUserId?: string | null;
  changedBy?: DealActor | null;
  comment?: string | null;
  createdAt: string;
}

export interface Deal {
  id: string;
  type: DealType;
  status: DealStatus;
  createdAt: string;
  updatedAt: string;
  unit?: DealUnit | null;
  client?: DealClient | null;
  manager?: DealManager | null;
  comments?: DealComment[];
  statusHistory?: DealStatusHistoryItem[];
}

export interface FetchDealsOptions {
  type?: DealType;
  status?: DealStatus;
  from?: string;
  to?: string;
}

export interface CreateDealPayload {
  unitId: string;
  clientFullName: string;
  clientPhone: string;
  type: DealType;
  status: DealStatus;
}

export interface UpdateDealStatusPayload {
  status: DealStatus;
  comment?: string;
}

export interface CreateDealCommentPayload {
  text: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const text = await res.text().catch(() => '');
  throw new Error(text || fallback);
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
    await parseError(res, 'Не удалось загрузить сделки');
  }

  return res.json();
}

export async function fetchDealById(id: string): Promise<Deal> {
  const res = await fetch(`${API_URL}/deals/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    await parseError(res, 'Сделка не найдена');
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
    await parseError(res, 'Ошибка при создании сделки');
  }

  return res.json();
}

export async function updateDealStatus(
  id: string,
  payload: UpdateDealStatusPayload,
): Promise<Deal> {
  const res = await fetch(`${API_URL}/deals/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseError(res, 'Не удалось обновить статус сделки');
  }

  return res.json();
}

export async function fetchDealStatusHistory(
  dealId: string,
): Promise<DealStatusHistoryItem[]> {
  const res = await fetch(`${API_URL}/deals/${dealId}/status-history`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    await parseError(
      res,
      'Не удалось загрузить историю статусов сделки',
    );
  }

  return res.json();
}

export async function fetchDealComments(
  dealId: string,
): Promise<DealComment[]> {
  const res = await fetch(`${API_URL}/deals/${dealId}/comments`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    await parseError(res, 'Не удалось загрузить комментарии по сделке');
  }

  return res.json();
}

export async function createDealComment(
  dealId: string,
  payload: CreateDealCommentPayload,
): Promise<DealComment> {
  const res = await fetch(`${API_URL}/deals/${dealId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseError(res, 'Не удалось добавить комментарий по сделке');
  }

  return res.json();
}