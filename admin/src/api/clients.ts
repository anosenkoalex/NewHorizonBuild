const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// тот же ключ, что использует AuthContext
const STORAGE_TOKEN_KEY = 'nhb_token';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export interface ClientDealRef {
  id: string;
  createdAt: string;
}

export interface ClientDealDetailedCommentAuthor {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface ClientDealDetailedComment {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  author?: ClientDealDetailedCommentAuthor | null;
}

export interface ClientDealDetailedStatusActor {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface ClientDealDetailedStatusHistoryItem {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  comment?: string | null;
  createdAt: string;
  changedBy?: ClientDealDetailedStatusActor | null;
}

export interface ClientDealDetailedUnit {
  id: string;
  number: string | null;
  type: string;
  status: string;
  area?: number | null;
  price?: number | string | null;
  projectId?: string | null;
}

export interface ClientDealDetailedManager {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
}

export interface ClientDealDetailed {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  unit?: ClientDealDetailedUnit | null;
  manager?: ClientDealDetailedManager | null;
  comments?: ClientDealDetailedComment[];
  statusHistory?: ClientDealDetailedStatusHistoryItem[];
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  createdAt: string;
  deals: ClientDealRef[];
}

export interface ClientDetailsEntity {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  createdAt: string;
  deals: ClientDealDetailed[];
}

export interface CreateClientPayload {
  fullName: string;
  phone: string;
  email?: string | null;
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const text = await res.text().catch(() => '');

  if (!text) {
    throw new Error(fallback);
  }

  try {
    const parsed = JSON.parse(text);

    if (typeof parsed?.message === 'string' && parsed.message.trim()) {
      throw new Error(parsed.message);
    }

    if (Array.isArray(parsed?.message) && parsed.message.length) {
      throw new Error(parsed.message.join(', '));
    }

    if (typeof parsed?.error === 'string' && parsed.error.trim()) {
      throw new Error(parsed.error);
    }

    throw new Error(text);
  } catch {
    throw new Error(text || fallback);
  }
}

export async function fetchClients(): Promise<Client[]> {
  const res = await fetch(`${API_URL}/clients`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    await parseError(res, 'Не удалось загрузить список клиентов');
  }

  return res.json();
}

export async function fetchClientById(id: string): Promise<ClientDetailsEntity> {
  const res = await fetch(`${API_URL}/clients/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    await parseError(res, 'Не удалось загрузить карточку клиента');
  }

  return res.json();
}

export async function createClient(
  payload: CreateClientPayload,
): Promise<Client> {
  const res = await fetch(`${API_URL}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseError(res, 'Ошибка при создании клиента');
  }

  return res.json();
}