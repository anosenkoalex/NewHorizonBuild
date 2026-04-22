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

export interface CreateDocumentTemplatePayload {
  name: string;
  type: string;
  content: string;
}

export interface UpdateDocumentTemplatePayload {
  name?: string;
  type?: string;
  content?: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(
  res: Response,
  fallback: string,
): Promise<never> {
  const text = await res.text().catch(() => '');
  throw new Error(
    text || `${fallback} (status ${res.status})`,
  );
}

export async function fetchDocumentTemplates(): Promise<DocumentTemplate[]> {
  const res = await fetch(`${API_URL}/document-templates`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    await parseError(res, 'Не удалось загрузить шаблоны документов');
  }

  return res.json();
}

export async function fetchDocumentTemplateById(
  id: string,
): Promise<DocumentTemplate> {
  const res = await fetch(`${API_URL}/document-templates/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    await parseError(res, 'Не удалось загрузить шаблон документа');
  }

  return res.json();
}

export async function createDocumentTemplate(
  payload: CreateDocumentTemplatePayload,
): Promise<DocumentTemplate> {
  const res = await fetch(`${API_URL}/document-templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseError(res, 'Ошибка при создании шаблона');
  }

  return res.json();
}

export async function updateDocumentTemplate(
  id: string,
  payload: UpdateDocumentTemplatePayload,
): Promise<DocumentTemplate> {
  const res = await fetch(`${API_URL}/document-templates/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseError(res, 'Ошибка при обновлении шаблона');
  }

  return res.json();
}

export async function deleteDocumentTemplate(
  id: string,
): Promise<DocumentTemplate> {
  const res = await fetch(`${API_URL}/document-templates/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    await parseError(res, 'Ошибка при удалении шаблона');
  }

  return res.json();
}