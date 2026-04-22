// admin/src/api/users.ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// тот же ключ, что и в AuthContext
const STORAGE_TOKEN_KEY = 'nhb_token';

export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES_HEAD'
  | 'LEGAL'
  | 'VIEWER';

export interface UserItem {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
}

export const ALL_ROLES: UserRole[] = [
  'ADMIN',
  'MANAGER',
  'SALES_HEAD',
  'LEGAL',
  'VIEWER',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  SALES_HEAD: 'Руководитель отдела продаж',
  LEGAL: 'Юрист',
  VIEWER: 'Только просмотр',
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
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

export async function fetchUsers(): Promise<UserItem[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/users`, { headers });

  if (!res.ok) {
    await parseError(res, 'Не удалось загрузить пользователей');
  }

  return res.json();
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<UserItem> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: String(payload.email ?? '').trim().toLowerCase(),
      fullName: String(payload.fullName ?? '').trim(),
      password: String(payload.password ?? ''),
      role: payload.role,
    }),
  });

  if (!res.ok) {
    await parseError(res, 'Не удалось создать пользователя');
  }

  return res.json();
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<UserItem> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/users/${userId}/role`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    await parseError(res, 'Не удалось изменить роль');
  }

  return res.json();
}