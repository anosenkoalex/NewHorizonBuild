import { API_BASE_URL } from './config';

export interface SalesReport {
  totalDeals: number;
  totalRevenue: number;
}

export async function fetchSalesReport(params?: {
  from?: string;
  to?: string;
}): Promise<SalesReport> {
  const url = new URL(`${API_BASE_URL}/reports/sales`);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch sales report');
  return res.json();
}
