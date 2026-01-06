// admin/src/api/documentTemplates.ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const STORAGE_TOKEN_KEY = 'nhb_token';

export interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchDocumentTemplates(): Promise<DocumentTemplate[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/document-templates`, { headers });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Не удалось загрузить шаблоны документов (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
  }

  return res.json();
}

export async function createDocumentTemplate(payload: {
  name: string;
  type: string;
  content: string;
}): Promise<DocumentTemplate> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`${API_URL}/document-templates`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Ошибка при создании шаблона (status ${res.status}${
        text ? `, ${text}` : ''
      })`,
    );
  }

  return res.json();
}
