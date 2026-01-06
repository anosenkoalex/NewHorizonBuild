// admin/src/api/units.ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// тот же ключ, что в AuthContext
const STORAGE_TOKEN_KEY = 'nhb_token';

export interface Unit {
  id: string;
  number: string | null;
  type: 'APARTMENT' | 'COMMERCIAL' | 'PARKING';
  status: 'FREE' | 'RESERVED' | 'SOLD' | 'INSTALLMENT' | 'EQUITY';
  area: number | null;
  price: number | null;

  // привязка к структуре проекта
  projectId: string;
  buildingId: string;
  sectionId: string | null;
  floorId: string | null;
  rooms: number | null;

  // ключ элемента в 3D-сцене
  modelElementKey: string | null;

  // ссылка на 2D-планировку (картинка / схема)
  planImageUrl: string | null;
}

export interface UnitsFilter {
  status?: string;
  type?: string;
  projectId?: string;
  buildingId?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchUnits(filters: UnitsFilter): Promise<Unit[]> {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.type) params.append('type', filters.type);
  if (filters.projectId) params.append('projectId', filters.projectId);
  if (filters.buildingId) params.append('buildingId', filters.buildingId);
  if (typeof filters.minPrice === 'number')
    params.append('minPrice', String(filters.minPrice));
  if (typeof filters.maxPrice === 'number')
    params.append('maxPrice', String(filters.maxPrice));
  if (typeof filters.minArea === 'number')
    params.append('minArea', String(filters.minArea));
  if (typeof filters.maxArea === 'number')
    params.append('maxArea', String(filters.maxArea));

  const query = params.toString();
  const url = query ? `${API_URL}/units?${query}` : `${API_URL}/units`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Не удалось загрузить список объектов');
  }

  return res.json();
}

/**
 * Обновить привязку юнита к элементу 3D-модели.
 * modelElementKey может быть null, чтобы отвязать.
 */
export async function updateUnitModelElementKey(
  unitId: string,
  modelElementKey: string | null,
): Promise<Unit> {
  const res = await fetch(
    `${API_URL}/units/${unitId}/model-element-key`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ modelElementKey }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Не удалось обновить связку 3D-модели: ${text}`,
    );
  }

  return res.json();
}

/**
 * Обновить ссылку на 2D-планировку юнита.
 * planImageUrl может быть null, чтобы удалить план.
 */
export async function updateUnitPlanImageUrl(
  unitId: string,
  planImageUrl: string | null,
): Promise<Unit> {
  const res = await fetch(
    `${API_URL}/units/${unitId}/plan-image-url`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ planImageUrl }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Не удалось обновить планировку объекта: ${text}`,
    );
  }

  return res.json();
}
