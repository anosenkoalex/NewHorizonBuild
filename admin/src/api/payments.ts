// admin/src/api/payments.ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const STORAGE_TOKEN_KEY = 'nhb_token';

export type PaymentStatus = 'PLANNED' | 'PAID' | 'OVERDUE';

export interface Payment {
  id: string;
  dealId: string;
  dueDate: string;
  amount: number;
  status: PaymentStatus;
  paidAt: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentPayload {
  dealId: string;
  dueDate: string; // "2025-01-31"
  amount: number;
  comment?: string;
}

export interface UpdatePaymentPayload {
  dueDate?: string;
  amount?: number;
  status?: PaymentStatus;
  comment?: string | null;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchPaymentsByDeal(
  dealId: string,
): Promise<Payment[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/payments/by-deal/${dealId}`, {
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Не удалось загрузить платежи (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
  }

  return res.json();
}

export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<Payment> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Ошибка при создании платежа (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
  }

  return res.json();
}

export async function updatePayment(
  id: string,
  payload: UpdatePaymentPayload,
): Promise<Payment> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/payments/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Ошибка при обновлении платежа (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
  }

  return res.json();
}
