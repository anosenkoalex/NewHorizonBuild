// admin/src/api/units.ts
const API_URL = (() => {
  const raw = String(
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  ).trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

const STORAGE_TOKEN_KEY = 'nhb_token';

export type UnitType = 'APARTMENT' | 'COMMERCIAL' | 'PARKING';
export type UnitStatus =
  | 'FREE'
  | 'RESERVED'
  | 'SOLD'
  | 'INSTALLMENT'
  | 'EQUITY';

export interface UnitPlanVariant {
  id: string;
  unitId: string;
  name: string;
  code: string | null;
  description: string | null;
  area: number | null;
  rooms: number | null;
  isDefault: boolean;
  planImageUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Unit {
  id: string;
  number: string | null;
  type: UnitType;
  status: UnitStatus;
  area: number | null;
  price: number | string | null;

  projectId: string | null;
  buildingId: string | null;
  sectionId: string | null;
  floorId: string | null;
  rooms: number | null;

  modelElementKey: string | null;
  planImageUrl: string | null;

  planVariants?: UnitPlanVariant[];
}

export interface UnitsFilter {
  status?: UnitStatus | string;
  type?: UnitType | string;
  projectId?: string;
  buildingId?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
}

export interface UpdateUnit3DPayload {
  modelElementKey?: string | null;
  planImageUrl?: string | null;
}

export interface CreateUnitPlanVariantPayload {
  name: string;
  code?: string | null;
  description?: string | null;
  area?: number | null;
  rooms?: number | null;
  isDefault?: boolean;
  planImageUrl?: string | null;
}

export interface UpdateUnitPlanVariantPayload {
  name?: string;
  code?: string | null;
  description?: string | null;
  area?: number | null;
  rooms?: number | null;
  isDefault?: boolean;
  planImageUrl?: string | null;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

function normalizeNullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function buildUnitsQuery(filters: UnitsFilter = {}): string {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', String(filters.status));
  if (filters.type) params.append('type', String(filters.type));
  if (filters.projectId?.trim()) params.append('projectId', filters.projectId.trim());
  if (filters.buildingId?.trim()) params.append('buildingId', filters.buildingId.trim());

  if (typeof filters.minPrice === 'number' && Number.isFinite(filters.minPrice)) {
    params.append('minPrice', String(filters.minPrice));
  }

  if (typeof filters.maxPrice === 'number' && Number.isFinite(filters.maxPrice)) {
    params.append('maxPrice', String(filters.maxPrice));
  }

  if (typeof filters.minArea === 'number' && Number.isFinite(filters.minArea)) {
    params.append('minArea', String(filters.minArea));
  }

  if (typeof filters.maxArea === 'number' && Number.isFinite(filters.maxArea)) {
    params.append('maxArea', String(filters.maxArea));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

async function getErrorMessageFromResponse(res: Response): Promise<string> {
  const rawText = await res.text().catch(() => '');

  if (!rawText) {
    return `HTTP ${res.status}`;
  }

  try {
    const parsed = JSON.parse(rawText);

    if (typeof parsed?.message === 'string') {
      return parsed.message;
    }

    if (Array.isArray(parsed?.message)) {
      return parsed.message.join(', ');
    }

    if (typeof parsed?.error === 'string') {
      return parsed.error;
    }

    return rawText;
  } catch {
    return rawText;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(await getErrorMessageFromResponse(res));
  }

  if (res.status === 204) {
    return null as T;
  }

  const text = await res.text();
  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

export async function fetchUnits(filters: UnitsFilter = {}): Promise<Unit[]> {
  return request<Unit[]>(`/units${buildUnitsQuery(filters)}`, {
    method: 'GET',
  });
}

/**
 * Общий update 3D-полей юнита.
 * Можно передать modelElementKey, planImageUrl или оба поля сразу.
 */
export async function updateUnit3D(
  unitId: string,
  payload: UpdateUnit3DPayload,
): Promise<Unit | { success: true }> {
  const body: UpdateUnit3DPayload = {
    ...(payload.modelElementKey !== undefined && {
      modelElementKey: normalizeNullableText(payload.modelElementKey) ?? null,
    }),
    ...(payload.planImageUrl !== undefined && {
      planImageUrl: normalizeNullableText(payload.planImageUrl) ?? null,
    }),
  };

  return request<Unit | { success: true }>(
    `/units/${encodeURIComponent(unitId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

/**
 * Обновить привязку юнита к элементу 3D-модели.
 * modelElementKey может быть null, чтобы отвязать.
 */
export async function updateUnitModelElementKey(
  unitId: string,
  modelElementKey: string | null,
): Promise<Unit> {
  return request<Unit>(
    `/units/${encodeURIComponent(unitId)}/model-element-key`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        modelElementKey: normalizeNullableText(modelElementKey) ?? null,
      }),
    },
  );
}

/**
 * Обновить ссылку на 2D-планировку юнита.
 * planImageUrl может быть null, чтобы удалить план.
 */
export async function updateUnitPlanImageUrl(
  unitId: string,
  planImageUrl: string | null,
): Promise<Unit> {
  return request<Unit>(
    `/units/${encodeURIComponent(unitId)}/plan-image-url`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        planImageUrl: normalizeNullableText(planImageUrl) ?? null,
      }),
    },
  );
}

/**
 * Список вариантов планировок для юнита.
 */
export async function fetchUnitPlanVariants(
  unitId: string,
): Promise<UnitPlanVariant[]> {
  return request<UnitPlanVariant[]>(
    `/units/${encodeURIComponent(unitId)}/plan-variants`,
    {
      method: 'GET',
    },
  );
}

/**
 * Создать вариант планировки.
 */
export async function createUnitPlanVariant(
  unitId: string,
  payload: CreateUnitPlanVariantPayload,
): Promise<UnitPlanVariant> {
  return request<UnitPlanVariant>(
    `/units/${encodeURIComponent(unitId)}/plan-variants`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: String(payload.name ?? '').trim(),
        code: normalizeNullableText(payload.code),
        description: normalizeNullableText(payload.description),
        area: payload.area ?? null,
        rooms: payload.rooms ?? null,
        isDefault: payload.isDefault,
        planImageUrl: normalizeNullableText(payload.planImageUrl),
      }),
    },
  );
}

/**
 * Обновить вариант планировки.
 */
export async function updateUnitPlanVariant(
  unitId: string,
  variantId: string,
  payload: UpdateUnitPlanVariantPayload,
): Promise<UnitPlanVariant> {
  return request<UnitPlanVariant>(
    `/units/${encodeURIComponent(unitId)}/plan-variants/${encodeURIComponent(
      variantId,
    )}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ...(payload.name !== undefined && {
          name: String(payload.name ?? '').trim(),
        }),
        ...(payload.code !== undefined && {
          code: normalizeNullableText(payload.code) ?? null,
        }),
        ...(payload.description !== undefined && {
          description: normalizeNullableText(payload.description) ?? null,
        }),
        ...(payload.area !== undefined && {
          area: payload.area,
        }),
        ...(payload.rooms !== undefined && {
          rooms: payload.rooms,
        }),
        ...(payload.isDefault !== undefined && {
          isDefault: payload.isDefault,
        }),
        ...(payload.planImageUrl !== undefined && {
          planImageUrl: normalizeNullableText(payload.planImageUrl) ?? null,
        }),
      }),
    },
  );
}

/**
 * Удалить вариант планировки.
 */
export async function deleteUnitPlanVariant(
  unitId: string,
  variantId: string,
): Promise<void> {
  await request<void>(
    `/units/${encodeURIComponent(unitId)}/plan-variants/${encodeURIComponent(
      variantId,
    )}`,
    {
      method: 'DELETE',
    },
  );
}