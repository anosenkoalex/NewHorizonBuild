import { API_BASE_URL } from './config';

export interface Unit {
  id: string;
  number?: string | null;
  type: string;
  status: string;
  area?: number | null;
  price?: number | null;
}

export async function fetchUnits(): Promise<Unit[]> {
  const res = await fetch(`${API_BASE_URL}/units`);
  if (!res.ok) {
    throw new Error('Failed to fetch units');
  }
  return res.json();
}
