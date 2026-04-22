// admin/src/pages/Deals.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Deal,
  DealStatus,
  DealType,
  fetchDeals,
  updateDealStatus,
} from '../api/deals';

const Deals: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<DealType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] =
    useState<DealStatus | 'ALL'>('ALL');

  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [focusedDealId, setFocusedDealId] = useState<string | null>(null);
  const [updatingDealId, setUpdatingDealId] = useState<string | null>(null);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    const loadDeals = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchDeals();
        setDeals(data);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Не удалось загрузить сделки');
      } finally {
        setLoading(false);
      }
    };

    void loadDeals();
  }, []);

  const toNumber = (value: number | string | null | undefined): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const filteredDeals = useMemo(() => {
    const fromDate =
      dateFrom && !Number.isNaN(new Date(dateFrom).getTime())
        ? new Date(dateFrom)
        : null;

    const toDate =
      dateTo && !Number.isNaN(new Date(dateTo).getTime())
        ? new Date(dateTo)
        : null;

    const search = searchText.trim().toLowerCase();

    return deals.filter((deal) => {
      if (typeFilter !== 'ALL' && deal.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && deal.status !== statusFilter) {
        return false;
      }

      if (fromDate || toDate) {
        const created = new Date(deal.createdAt);

        if (fromDate && created < fromDate) return false;

        if (toDate) {
          const toCopy = new Date(toDate);
          toCopy.setHours(23, 59, 59, 999);
          if (created > toCopy) return false;
        }
      }

      if (search) {
        const parts: string[] = [];

        if (deal.id) parts.push(deal.id);
        if (deal.client?.fullName) parts.push(deal.client.fullName);
        if (deal.client?.phone) parts.push(deal.client.phone);
        if (deal.unit?.number) parts.push(deal.unit.number);
        if (deal.unit?.type) parts.push(deal.unit.type);
        if (deal.manager?.fullName) parts.push(deal.manager.fullName);

        const haystack = parts.join(' ').toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [deals, typeFilter, statusFilter, searchText, dateFrom, dateTo]);

  const totalSum = useMemo(() => {
    return filteredDeals.reduce(
      (acc, d) => acc + toNumber(d.unit?.price),
      0,
    );
  }, [filteredDeals]);

  const sumByType = useMemo(() => {
    return filteredDeals.reduce(
      (acc, d) => {
        const price = toNumber(d.unit?.price);

        if (d.type === 'SALE') acc.SALE += price;
        if (d.type === 'INSTALLMENT') acc.INSTALLMENT += price;
        if (d.type === 'EQUITY') acc.EQUITY += price;

        return acc;
      },
      { SALE: 0, INSTALLMENT: 0, EQUITY: 0 },
    );
  }, [filteredDeals]);

  const formatPrice = (value?: number | string | null): string => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const num =
      typeof value === 'number' ? value : Number(value);

    if (Number.isNaN(num)) {
      return String(value);
    }

    return num.toLocaleString('ru-RU', {
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('ru-RU');
  };

  const containerStyle: React.CSSProperties = {
    padding: '0 24px 32px',
    maxWidth: 1280,
    margin: '0 auto',
    color: 'var(--nh-text-main)',
  };

  const sectionCard: React.CSSProperties = {
    borderRadius: 16,
    background:
      'radial-gradient(circle at top left, var(--nh-accent-soft), transparent 55%), var(--nh-bg-elevated)',
    color: 'var(--nh-text-main)',
    padding: 18,
    boxShadow: '0 14px 32px rgba(15,23,42,0.35)',
    marginBottom: 18,
    border: '1px solid var(--nh-border-subtle)',
  };

  const inputBase: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid var(--nh-border-subtle)',
    backgroundColor: 'var(--nh-bg-main)',
    color: 'var(--nh-text-main)',
    fontSize: 13,
    outline: 'none',
  };

  const selectBase: React.CSSProperties = {
    ...inputBase,
    paddingRight: 24,
  };

  const chipBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
  };

  const getTypeLabel = (type: DealType) => {
    if (type === 'SALE') return 'Продажа';
    if (type === 'INSTALLMENT') return 'Рассрочка';
    return 'Долевое участие';
  };

  const getStatusLabel = (status: DealStatus) => {
    if (status === 'DRAFT') return 'Черновик';
    if (status === 'ACTIVE') return 'Активна';
    if (status === 'COMPLETED') return 'Завершена';
    return 'Отменена';
  };

  const getStatusColor = (status: DealStatus) => {
    if (status === 'DRAFT') return '#6b7280';
    if (status === 'ACTIVE') return '#3b82f6';
    if (status === 'COMPLETED') return '#16a34a';
    return '#ef4444';
  };

  const handleStatusChange = async (
    dealId: string,
    newStatus: DealStatus,
  ) => {
    setError(null);
    setUpdatingDealId(dealId);

    const previousDeals = deals;

    setDeals((current) =>
      current.map((d) =>
        d.id === dealId ? { ...d, status: newStatus } : d,
      ),
    );

    try {
      const updatedDeal = await updateDealStatus(dealId, {
        status: newStatus,
      });

      setDeals((current) =>
        current.map((d) =>
          d.id === dealId ? { ...d, ...updatedDeal } : d,
        ),
      );
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Не удалось изменить статус сделки');
      setDeals(previousDeals);
    } finally {
      setUpdatingDealId(null);
    }
  };

  const handleRowClick = (deal: Deal) => {
    navigate(`/deals/${deal.id}`, {
      state: {
        dealId: deal.id,
        deal,
      },
    });
  };

  useEffect(() => {
    const state = (location.state as any) || {};
    if (!state.focusDealId) return;

    const focusId = String(state.focusDealId);
    setFocusedDealId(focusId);

    const timeoutId = window.setTimeout(() => {
      const row = rowRefs.current[focusId];
      if (row && typeof row.scrollIntoView === 'function') {
        row.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [location.state, filteredDeals]);

  return (
    <div style={containerStyle}>
      <header style={{ margin: '4px 0 16px' }}>
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            opacity: 0.6,
            color: 'var(--nh-text-muted)',
          }}
        >
          Работа с клиентами
        </div>
        <h1
          style={{
            margin: '4px 0 4px',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Сделки
        </h1>
        <div
          style={{
            fontSize: 13,
            opacity: 0.75,
            color: 'var(--nh-text-muted)',
          }}
        >
          Всего сделок: {deals.length}. В выборке: {filteredDeals.length}
        </div>
      </header>

      <section style={sectionCard}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div
            style={{
              flex: '1 1 180px',
              padding: 12,
              borderRadius: 14,
              border: '1px solid rgba(148,163,184,0.28)',
              background:
                'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))',
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                opacity: 0.7,
                marginBottom: 4,
              }}
            >
              Общая сумма сделок
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              {formatPrice(totalSum)} сом
            </div>
          </div>

          <div
            style={{
              flex: '1 1 160px',
              padding: 12,
              borderRadius: 14,
              border: '1px solid rgba(34,197,94,0.28)',
              background:
                'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))',
            }}
          >
            <div
              style={{
                fontSize: 12,
                opacity: 0.7,
                marginBottom: 3,
              }}
            >
              Продажи
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {formatPrice(sumByType.SALE)} сом
            </div>
          </div>

          <div
            style={{
              flex: '1 1 160px',
              padding: 12,
              borderRadius: 14,
              border: '1px solid rgba(59,130,246,0.28)',
              background:
                'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))',
            }}
          >
            <div
              style={{
                fontSize: 12,
                opacity: 0.7,
                marginBottom: 3,
              }}
            >
              Рассрочка
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {formatPrice(sumByType.INSTALLMENT)} сом
            </div>
          </div>

          <div
            style={{
              flex: '1 1 160px',
              padding: 12,
              borderRadius: 14,
              border: '1px solid rgba(129,140,248,0.28)',
              background:
                'linear-gradient(135deg, rgba(129,140,248,0.08), rgba(129,140,248,0.02))',
            }}
          >
            <div
              style={{
                fontSize: 12,
                opacity: 0.7,
                marginBottom: 3,
              }}
            >
              Долевое участие
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {formatPrice(sumByType.EQUITY)} сом
            </div>
          </div>
        </div>
      </section>

      <section style={sectionCard}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'flex-end',
          }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Тип
            </label>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as DealType | 'ALL')
              }
              style={selectBase}
            >
              <option value="ALL">Все</option>
              <option value="SALE">Продажа</option>
              <option value="INSTALLMENT">Рассрочка</option>
              <option value="EQUITY">Долевое участие</option>
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Статус
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as DealStatus | 'ALL')
              }
              style={selectBase}
            >
              <option value="ALL">Все</option>
              <option value="DRAFT">Черновик</option>
              <option value="ACTIVE">Активна</option>
              <option value="COMPLETED">Завершена</option>
              <option value="CANCELED">Отменена</option>
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Период c
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={inputBase}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              по
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={inputBase}
            />
          </div>

          <div style={{ flex: '1 1 220px', minWidth: 220 }}>
            <label
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Поиск
            </label>
            <input
              type="text"
              placeholder="Клиент, телефон, номер объекта, ID..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ ...inputBase, width: '100%' }}
            />
          </div>

          {loading && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                marginTop: 6,
              }}
            >
              Загрузка сделок…
            </div>
          )}

          {error && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--nh-danger)',
                marginTop: 6,
              }}
            >
              Ошибка: {error}
            </div>
          )}
        </div>
      </section>

      <section style={sectionCard}>
        <div
          style={{
            fontSize: 13,
            marginBottom: 8,
            color: 'var(--nh-text-muted)',
          }}
        >
          Реестр сделок
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 900,
            }}
          >
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
                  <tr
                    key={deal.id}
                    ref={(el) => {
                      rowRefs.current[deal.id] = el;
                    }}
                    onClick={() => handleRowClick(deal)}
                    style={{
                      backgroundColor:
                        deal.id === focusedDealId
                          ? 'rgba(59,130,246,0.14)'
                          : 'transparent',
                      transition: 'background-color 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={tdStyle}>{deal.id}</td>
                    <td style={tdStyle}>{formatDate(deal.createdAt)}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          ...chipBase,
                          backgroundColor: 'var(--nh-bg-main)',
                          border: '1px solid var(--nh-border-subtle)',
                        }}
                      >
                        {getTypeLabel(deal.type)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={deal.status}
                        disabled={updatingDealId === deal.id}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          void handleStatusChange(
                            deal.id,
                            e.target.value as DealStatus,
                          )
                        }
                        style={{
                          ...selectBase,
                          padding: '2px 10px',
                          borderRadius: 999,
                          backgroundColor: getStatusColor(deal.status),
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor:
                            updatingDealId === deal.id
                              ? 'not-allowed'
                              : 'pointer',
                          opacity: updatingDealId === deal.id ? 0.7 : 1,
                        }}
                      >
                        <option value="DRAFT">Черновик</option>
                        <option value="ACTIVE">Активна</option>
                        <option value="COMPLETED">Завершена</option>
                        <option value="CANCELED">Отменена</option>
                      </select>
                    </td>
                    <td style={tdStyle}>
                      {deal.unit?.number || '-'}
                      {deal.unit?.type ? ` (${deal.unit.type})` : ''}
                    </td>
                    <td style={tdStyle}>
                      {deal.client?.fullName || '-'}
                      {deal.client?.phone ? (
                        <span
                          style={{
                            opacity: 0.7,
                            fontSize: 12,
                            marginLeft: 4,
                          }}
                        >
                          ({deal.client.phone})
                        </span>
                      ) : null}
                    </td>
                    <td style={tdStyle}>{deal.manager?.fullName || '-'}</td>
                    <td style={tdStyle}>
                      {formatPrice(deal.unit?.price ?? null)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid var(--nh-border-subtle)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--nh-text-muted)',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid rgba(148,163,184,0.18)',
  fontSize: 13,
  color: 'var(--nh-text-main)',
};

export default Deals;