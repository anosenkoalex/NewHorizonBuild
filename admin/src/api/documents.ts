const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const STORAGE_TOKEN_KEY = 'nhb_token';

export type DocumentUserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES_HEAD'
  | 'LEGAL'
  | 'VIEWER';

export interface DocumentSignedBy {
  id: string;
  fullName: string;
  email: string;
  role: DocumentUserRole;
}

export interface DocumentTemplateRef {
  id: string;
  name: string;
  type: string;
}

export interface DocumentDealRef {
  id: string;
  type: string;
  status: string;
  unit?: {
    number: string | null;
    type: string;
  } | null;
  client?: {
    id?: string;
    fullName: string;
    phone: string;
  } | null;
  manager?: {
    fullName: string;
    email: string;
  } | null;
}

export interface DocumentItem {
  id: string;
  type: string;
  fileUrl: string | null;
  content: string | null;
  createdAt: string;
  updatedAt?: string;
  signedAt: string | null;
  signedBy?: DocumentSignedBy | null;
  template?: DocumentTemplateRef | null;
  deal: DocumentDealRef;
}

export interface CreateDocumentPayload {
  dealId: string;
  type: string;
  fileUrl?: string | null;
  content?: string | null;
}

export interface GenerateDocumentFromTemplatePayload {
  templateId: string;
  dealId: string;
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

async function parseError(
  res: Response,
  fallback: string,
): Promise<never> {
  const text = await res.text().catch(() => '');
  throw new Error(text || `${fallback} (status ${res.status})`);
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
  const res = await fetch(`${API_URL}/documents${buildQuery(params)}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    await parseError(res, 'Не удалось загрузить документы');
  }

  return res.json();
}

export async function createDocument(
  payload: CreateDocumentPayload,
): Promise<DocumentItem> {
  const res = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      dealId: payload.dealId,
      type: payload.type,
      fileUrl: payload.fileUrl ?? null,
      content: payload.content ?? null,
    }),
  });

  if (!res.ok) {
    await parseError(res, 'Ошибка при создании документа');
  }

  return res.json();
}

export async function generateDocumentFromTemplate(
  payload: GenerateDocumentFromTemplatePayload,
): Promise<DocumentItem> {
  const res = await fetch(`${API_URL}/documents/generate-from-template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseError(res, 'Ошибка при генерации документа');
  }

  return res.json();
}

export async function signDocument(id: string): Promise<DocumentItem> {
  const res = await fetch(`${API_URL}/documents/${id}/sign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    await parseError(res, 'Ошибка при подписании документа');
  }

  return res.json();
}