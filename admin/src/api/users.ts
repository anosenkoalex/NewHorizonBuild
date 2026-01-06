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

// всегда возвращаем простой объект headers
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchUsers(): Promise<UserItem[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/users`, { headers });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Не удалось загрузить пользователей (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
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
    const text = await res.text().catch(() => '');
    throw new Error(
      `Не удалось изменить роль (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
  }

  return res.json();
}
