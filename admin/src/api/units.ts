import { API_BASE_URL } from './config';

export interface Unit {
  id: string;
  number?: string | null;
  type: string;
  status: string;
  area?: number | null;
  price?: number | null;
}

export interface UnitsFilter {
  status?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
}

export async function fetchUnits(filters?: UnitsFilter): Promise<Unit[]> {
  const params = new URLSearchParams();

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  const url = queryString ? `${API_BASE_URL}/units?${queryString}` : `${API_BASE_URL}/units`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch units');
  }
  return res.json();
}
