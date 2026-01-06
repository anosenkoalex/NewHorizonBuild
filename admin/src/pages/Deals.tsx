import React, { useEffect, useMemo, useState } from 'react';

type DealType = 'SALE' | 'INSTALLMENT' | 'EQUITY';
type DealStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';

interface UnitInfo {
  number?: string | null;
  type?: string | null;
  price?: number | null;
}

interface ClientInfo {
  fullName?: string | null;
  phone?: string | null;
}

interface ManagerInfo {
  fullName?: string | null;
  email?: string | null;
}

interface Deal {
  id: string;
  type: DealType;
  status: DealStatus;
  createdAt: string;
  unit?: UnitInfo | null;
  client?: ClientInfo | null;
  manager?: ManagerInfo | null;
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const Deals: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<DealType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] =
    useState<DealStatus | 'ALL'>('ALL');

  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_URL}/deals`);
        if (!res.ok) {
          throw new Error(`Ошибка загрузки сделок: ${res.status}`);
        }
        const data = await res.json();
        // Ожидаем, что бэк вернёт массив
        setDeals(data as Deal[]);
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Не удалось загрузить сделки');
      } finally {
        setLoading(false);
      }
    };

    void fetchDeals();
  }, []);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (typeFilter !== 'ALL' && deal.type !== typeFilter) return false;
      if (
        statusFilter !== 'ALL' &&
        deal.status !== statusFilter
      )
        return false;
      return true;
    });
  }, [deals, typeFilter, statusFilter]);

  const formatPrice = (value?: number | null) => {
    if (!value && value !== 0) return '-';
    return value.toLocaleString('ru-RU', {
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('ru-RU');
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Сделки</h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
            Тип
          </label>
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as DealType | 'ALL')
            }
            style={{ padding: '4px 8px', borderRadius: 4 }}
          >
            <option value="ALL">Все</option>
            <option value="SALE">Продажа</option>
            <option value="INSTALLMENT">Рассрочка</option>
            <option value="EQUITY">Долевое участие</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
            Статус
          </label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as DealStatus | 'ALL')
            }
            style={{ padding: '4px 8px', borderRadius: 4 }}
          >
            <option value="ALL">Все</option>
            <option value="DRAFT">Черновик</option>
            <option value="ACTIVE">Активна</option>
            <option value="COMPLETED">Завершена</option>
            <option value="CANCELED">Отменена</option>
          </select>
        </div>
      </div>

      {loading && <div>Загрузка сделок...</div>}
      {error && (
        <div style={{ color: 'red', marginBottom: 12 }}>Ошибка: {error}</div>
      )}

      {!loading && !error && (
        <div
          style={{
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Дата</th>
                <th style={thStyle}>Тип</th>
                <th style={thStyle}>Статус</th>
                <th style={thStyle}>Объект</th>
                <th style={thStyle}>Клиент</th>
                <th style={thStyle}>Менеджер</th>
                <th style={thStyle}>Сумма (сом)</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan={8}>
                    Сделок не найдено.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr key={deal.id}>
                    <td style={tdStyle}>{deal.id}</td>
                    <td style={tdStyle}>{formatDate(deal.createdAt)}</td>
                    <td style={tdStyle}>{deal.type}</td>
                    <td style={tdStyle}>{deal.status}</td>
                    <td style={tdStyle}>
                      {deal.unit?.number || '-'}
                      {deal.unit?.type ? ` (${deal.unit.type})` : ''}
                    </td>
                    <td style={tdStyle}>
                      {deal.client?.fullName || '-'}
                      {deal.client?.phone ? (
                        <span style={{ opacity: 0.7 }}>
                          {' '}
                          ({deal.client.phone})
                        </span>
                      ) : null}
                    </td>
                    <td style={tdStyle}>{deal.manager?.fullName || '-'}</td>
                    <td style={tdStyle}>{formatPrice(deal.unit?.price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 13,
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid #f3f4f6',
  fontSize: 13,
};

export default Deals;
