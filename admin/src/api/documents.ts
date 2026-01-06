const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const STORAGE_TOKEN_KEY = 'nhb_token';

export interface DocumentItem {
  id: string;
  type: string;
  fileUrl: string | null;
  createdAt: string;

  // Подпись
  signedAt: string | null;
  signedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;

  deal: {
    id: string;
    type: string;
    status: string;
    unit?: {
      number: string | null;
      type: string;
    } | null;
    client?: {
      fullName: string;
      phone: string;
    } | null;
    manager?: {
      fullName: string;
      email: string;
    } | null;
  };
}

export interface CreateDocumentPayload {
  dealId: string;
  type: string;
  fileUrl: string;
}

export interface FetchDocumentsParams {
  dealId?: string;
  type?: string;
  clientId?: string;
  unitId?: string;
  from?: string;
  to?: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

function buildQuery(params?: FetchDocumentsParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchDocuments(
  params?: FetchDocumentsParams,
): Promise<DocumentItem[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const query = buildQuery(params);

  const res = await fetch(`${API_URL}/documents${query}`, { headers });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Не удалось загрузить документы (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
  }

  return res.json();
}

export async function createDocument(
  payload: CreateDocumentPayload,
): Promise<DocumentItem> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Ошибка при создании документа (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
  }

  return res.json();
}

export async function generateDocumentFromTemplate(payload: {
  templateId: string;
  dealId: string;
}): Promise<DocumentItem> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/documents/generate-from-template`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Ошибка при генерации документа (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
  }

  return res.json();
}

/**
 * Подписать документ.
 */
export async function signDocument(id: string): Promise<DocumentItem> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/documents/${id}/sign`, {
    method: 'PATCH',
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Ошибка при подписании документа (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
  }

  return res.json();
}
