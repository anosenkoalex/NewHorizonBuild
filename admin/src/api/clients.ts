// admin/src/api/clients.ts
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

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  createdAt: string;
  deals: ClientDealRef[];
}

export interface CreateClientPayload {
  fullName: string;
  phone: string;
  email?: string | null;
}

export async function fetchClients(): Promise<Client[]> {
  const res = await fetch(`${API_URL}/clients`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Не удалось загрузить список клиентов');
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
    const text = await res.text();
    throw new Error(`Ошибка при создании клиента: ${text}`);
  }

  return res.json();
}
