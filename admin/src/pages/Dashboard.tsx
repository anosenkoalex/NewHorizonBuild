// admin/src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import {
  fetchSalesReport,
  fetchDashboardSummary,
  UnitType,
  DealType,
  UnitStatus,
} from '../api/reports';

// Тип ответа берём из самой функции, чтоб не зависеть от ручного интерфейса
type SalesReportResponse = Awaited<ReturnType<typeof fetchSalesReport>>;
type ByUnitType = SalesReportResponse['byUnitType'];
type ByDealType = SalesReportResponse['byDealType'];
type ManagerRow = SalesReportResponse['byManager'][number];

type DashboardSummaryResponse = Awaited<
  ReturnType<typeof fetchDashboardSummary>
>;

type PeriodPreset = 'YEAR' | 'QUARTER' | 'MONTH' | 'CUSTOM';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<SalesReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [period, setPeriod] = useState<PeriodPreset>('YEAR');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatLocalDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Вычисляем from/to для выбранного пресета
  const computePeriodParams = (): { from?: string; to?: string } => {
    const now = new Date();

    if (period === 'CUSTOM') {
      const from = customFrom || undefined;
      const to = customTo || undefined;
      return { from, to };
    }

    if (period === 'YEAR') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return {
        from: formatLocalDate(startOfYear),
        to: formatLocalDate(now),
      };
    }

    if (period === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: formatLocalDate(startOfMonth),
        to: formatLocalDate(now),
      };
    }

    if (period === 'QUARTER') {
      const month = now.getMonth();
      const quarterIndex = Math.floor(month / 3);
      const quarterStartMonth = quarterIndex * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1);

      return {
        from: formatLocalDate(startOfQuarter),
        to: formatLocalDate(now),
      };
    }

    return {};
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = computePeriodParams();
      const report = await fetchSalesReport(params);
      setData(report);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Не удалось построить отчёт',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo]);

  // Сводка по объектам — грузим один раз
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const s = await fetchDashboardSummary();
        setSummary(s);
      } catch (e) {
        console.error(e);
        setSummaryError(
          e instanceof Error
            ? e.message
            : 'Не удалось загрузить сводку по объектам',
        );
      }
    };

    void loadSummary();
  }, []);

  if (loading && !data) {
    return <div style={{ padding: 24 }}>Загрузка Dashboard...</div>;
  }

  if (error && !data) {
    return <div style={{ padding: 24 }}>Ошибка: {error}</div>;
  }

  if (!data) return null;

  const { totalDeals, totalRevenue, byUnitType, byDealType, byManager } = data;

  const totalUnits = summary?.totalUnits ?? 0;
  const unitsByStatus = summary?.unitsByStatus;

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
    padding: 20,
    boxShadow: '0 14px 32px rgba(15,23,42,0.35)',
    marginBottom: 24,
    border: '1px solid var(--nh-border-subtle)',
  };

  const cardStyle: React.CSSProperties = {
    flex: '1 1 230px',
    padding: '16px 18px',
    borderRadius: 14,
    background:
      'radial-gradient(circle at top left, var(--nh-accent-soft), transparent 55%), var(--nh-bg-elevated)',
    color: 'var(--nh-text-main)',
    boxShadow: '0 10px 26px rgba(15,23,42,0.3)',
    border: '1px solid var(--nh-border-subtle)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.7,
    marginBottom: 6,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 600,
    marginBottom: 4,
  };

  const subValueStyle: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.8,
  };

  const tableHeadCell: React.CSSProperties = {
    textAlign: 'left',
    padding: '6px 8px',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--nh-text-muted)',
    borderBottom: '1px solid var(--nh-border-subtle)',
  };

  const tableRowCellLeft: React.CSSProperties = {
    borderBottom: '1px solid rgba(148,163,184,0.25)',
    padding: '6px 8px',
    fontSize: 13,
  };

  const tableRowCellRight: React.CSSProperties = {
    ...tableRowCellLeft,
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  };

  const fmtNumber = (n: number) =>
    new Intl.NumberFormat('ru-RU').format(Math.round(n));

  const fmtMoney = (n: number) => `${fmtNumber(n)} сом`;

  const getUnitStats = (obj: ByUnitType, type: UnitType) =>
    obj[type] ?? { count: 0, revenue: 0 };

  const getDealStats = (obj: ByDealType, type: DealType) =>
    obj[type] ?? { count: 0, revenue: 0 };

  const apartments = getUnitStats(byUnitType, 'APARTMENT');
  const commercial = getUnitStats(byUnitType, 'COMMERCIAL');

  const unitTypeOrder: { type: UnitType; label: string }[] = [
    { type: 'APARTMENT', label: 'Квартиры' },
    { type: 'COMMERCIAL', label: 'Коммерческая' },
    { type: 'PARKING', label: 'Паркинг' },
  ];

  const dealTypeOrder: { type: DealType; label: string }[] = [
    { type: 'SALE', label: 'Продажа' },
    { type: 'INSTALLMENT', label: 'Рассрочка' },
    { type: 'EQUITY', label: 'Долевое участие' },
  ];

  const statusOrder: { status: UnitStatus; label: string }[] = [
    { status: 'FREE', label: 'Свободно' },
    { status: 'RESERVED', label: 'Резерв' },
    { status: 'SOLD', label: 'Продано' },
    { status: 'INSTALLMENT', label: 'Рассрочка' },
    { status: 'EQUITY', label: 'Долевое участие' },
  ];

  const currentPeriodLabel = (() => {
    if (period === 'YEAR') return 'Этот год';
    if (period === 'QUARTER') return 'Этот квартал';
    if (period === 'MONTH') return 'Этот месяц';
    if (period === 'CUSTOM') return 'Произвольный период';
    return '';
  })();

  const periodControlsWrapper: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '12px 0 6px',
    flexWrap: 'wrap',
  };

  const pillBase: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid var(--nh-border-subtle)',
    backgroundColor: 'var(--nh-bg-elevated)',
    fontSize: 12,
    color: 'var(--nh-text-main)',
    cursor: 'pointer',
  };

  const periodButton = (value: PeriodPreset, label: string) => {
    const active = period === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setPeriod(value)}
        style={{
          ...pillBase,
          backgroundColor: active ? '#22c55e' : 'var(--nh-bg-elevated)',
          color: active ? '#022c22' : 'var(--nh-text-main)',
          borderColor: active ? '#22c55e' : 'var(--nh-border-subtle)',
          fontWeight: active ? 600 : 400,
        }}
      >
        {label}
      </button>
    );
  };

  const { from, to } = computePeriodParams();

  const totalUnitsForBar =
    unitsByStatus &&
    Object.values(unitsByStatus).reduce((acc, v) => acc + v, 0);

  const totalManagerRevenue = byManager.reduce(
    (acc, m) => acc + m.revenue,
    0,
  );

  const avgCheck =
    totalDeals > 0 ? Math.round(totalRevenue / totalDeals) : 0;

  return (
    <div style={containerStyle}>
      {/* Топовый заголовок дашборда */}
      <header style={{ margin: '18px 0 16px' }}>
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            opacity: 0.6,
            color: 'var(--nh-text-muted)',
          }}
        >
          NewHorizonBuild CRM
        </div>
        <h1
          style={{
            margin: '4px 0 4px',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          Обзор продаж и объектов
        </h1>
        <div
          style={{
            fontSize: 13,
            opacity: 0.75,
            color: 'var(--nh-text-muted)',
          }}
        >
          {currentPeriodLabel}
          {from && to ? ` · ${from} — ${to}` : ''}
          {summary && totalUnits > 0
            ? ` · Всего юнитов: ${fmtNumber(totalUnits)}`
            : ''}
        </div>
      </header>

      {/* Период + быстрые инсайты */}
      <section style={{ ...sectionCard, paddingBottom: 18 }}>
        <div style={periodControlsWrapper}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Период:</span>
          {periodButton('YEAR', 'Этот год')}
          {periodButton('QUARTER', 'Квартал')}
          {periodButton('MONTH', 'Месяц')}
          {periodButton('CUSTOM', 'Произвольный')}
        </div>

        {period === 'CUSTOM' && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 6,
              marginTop: 6,
            }}
          >
            <label style={{ fontSize: 12 }}>
              C:{' '}
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  padding: '4px 8px',
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid var(--nh-border-subtle)',
                  backgroundColor: 'var(--nh-bg-main)',
                  color: 'var(--nh-text-main)',
                }}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              По:{' '}
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  padding: '4px 8px',
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid var(--nh-border-subtle)',
                  backgroundColor: 'var(--nh-bg-main)',
                  color: 'var(--nh-text-main)',
                }}
              />
            </label>
            <button
              type="button"
              onClick={loadData}
              style={{
                ...pillBase,
                backgroundColor: '#22c55e',
                color: '#022c22',
                borderColor: '#22c55e',
                fontWeight: 600,
              }}
            >
              Обновить
            </button>
          </div>
        )}

        <div
          style={{
            fontSize: 12,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 4,
            color: 'var(--nh-text-muted)',
          }}
        >
          {loading && data && <span>Обновляем данные…</span>}
          {error && data && (
            <span style={{ color: 'var(--nh-danger)' }}>
              Ошибка при обновлении: {error}
            </span>
          )}
        </div>
      </section>

      {/* ВЕРХНИЙ РЯД КАРТОЧЕК */}
      <section
        style={{
          marginBottom: 24,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={cardStyle}>
          <div style={labelStyle}>Всего юнитов</div>
          <div style={valueStyle}>
            {summary ? fmtNumber(totalUnits) : '—'}
          </div>
          <div style={subValueStyle}>
            {summary ? 'Вся база объектов застройщика' : 'Загрузка...'}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Сделок за период</div>
          <div style={valueStyle}>{totalDeals}</div>
          <div style={subValueStyle}>
            Включая продажи, рассрочки и долевое участие
          </div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Общая выручка за период</div>
          <div style={valueStyle}>{fmtMoney(totalRevenue)}</div>
          <div style={subValueStyle}>По всем типам сделок</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Средний чек за период</div>
          <div style={valueStyle}>
            {totalDeals > 0 ? fmtMoney(avgCheck) : '—'}
          </div>
          <div style={subValueStyle}>
            Выручка / количество сделок за выбранный период
          </div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Продано квартир</div>
          <div style={valueStyle}>{apartments.count}</div>
          <div style={subValueStyle}>Квартиры в завершённых сделках</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Продано коммерческих объектов</div>
          <div style={valueStyle}>{commercial.count}</div>
          <div style={subValueStyle}>Офисы, торговые площади и т.п.</div>
        </div>
      </section>

      {/* БЛОК: Статусы + типы недвижимости */}
      <section style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Статусы */}
        <div style={{ ...sectionCard, flex: '1 1 320px' }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Статусы объектов</h2>

          {!summary && summaryError && (
            <p
              style={{
                marginTop: 8,
                color: 'var(--nh-danger)',
                fontSize: 13,
              }}
            >
              {summaryError}
            </p>
          )}

          {summary && totalUnitsForBar && totalUnitsForBar > 0 && (
            <>
              <div
                style={{
                  marginTop: 10,
                  marginBottom: 10,
                  height: 18,
                  borderRadius: 999,
                  overflow: 'hidden',
                  display: 'flex',
                  backgroundColor: 'var(--nh-bg-main)',
                  border: '1px solid var(--nh-border-subtle)',
                }}
              >
                {statusOrder.map(({ status }) => {
                  const count = unitsByStatus?.[status] ?? 0;
                  if (!count) return null;
                  const widthPercent = (count / totalUnitsForBar) * 100;

                  const bg =
                    status === 'FREE'
                      ? '#22c55e'
                      : status === 'RESERVED'
                      ? '#facc15'
                      : status === 'SOLD'
                      ? '#ef4444'
                      : status === 'INSTALLMENT'
                      ? '#3b82f6'
                      : '#a855f7';

                  return (
                    <div
                      key={status}
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: bg,
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.7,
                  color: 'var(--nh-text-muted)',
                  marginBottom: 8,
                }}
              >
                Распределение всех юнитов по статусам (100% = вся база).
              </div>
            </>
          )}

          {summary && (
            <table
              style={{
                borderCollapse: 'collapse',
                marginTop: 4,
                width: '100%',
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeadCell}>Статус</th>
                  <th style={{ ...tableHeadCell, textAlign: 'right' }}>
                    Кол-во
                  </th>
                  <th style={{ ...tableHeadCell, textAlign: 'right' }}>
                    Доля
                  </th>
                </tr>
              </thead>
              <tbody>
                {statusOrder.map(({ status, label }) => {
                  const count = unitsByStatus?.[status] ?? 0;
                  const pct =
                    totalUnitsForBar && totalUnitsForBar > 0
                      ? (count / totalUnitsForBar) * 100
                      : 0;

                  return (
                    <tr key={status}>
                      <td style={tableRowCellLeft}>{label}</td>
                      <td style={tableRowCellRight}>{count}</td>
                      <td style={tableRowCellRight}>
                        {pct > 0 ? `${pct.toFixed(1)}%` : '0%'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!summary && !summaryError && (
            <p
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--nh-text-muted)',
              }}
            >
              Загрузка сводки по объектам…
            </p>
          )}
        </div>

        {/* Тип недвижимости */}
        <div style={{ ...sectionCard, flex: '1 1 320px' }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>
            Разбивка по типу недвижимости
          </h2>
          <table
            style={{
              borderCollapse: 'collapse',
              marginTop: 4,
              width: '100%',
            }}
          >
            <thead>
              <tr>
                <th style={tableHeadCell}>Тип</th>
                <th style={{ ...tableHeadCell, textAlign: 'right' }}>
                  Сделок
                </th>
                <th style={{ ...tableHeadCell, textAlign: 'right' }}>
                  Выручка
                </th>
              </tr>
            </thead>
            <tbody>
              {unitTypeOrder.map(({ type, label }) => {
                const stats = getUnitStats(byUnitType, type);
                return (
                  <tr key={type}>
                    <td style={tableRowCellLeft}>{label}</td>
                    <td style={tableRowCellRight}>{stats.count}</td>
                    <td style={tableRowCellRight}>
                      {fmtMoney(stats.revenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* БЛОК: Тип сделок + менеджеры */}
      <section style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Типы сделок */}
        <div style={{ ...sectionCard, flex: '1 1 320px' }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>
            Разбивка по типу сделки
          </h2>
          <table
            style={{
              borderCollapse: 'collapse',
              marginTop: 4,
              width: '100%',
            }}
          >
            <thead>
              <tr>
                <th style={tableHeadCell}>Тип сделки</th>
                <th style={{ ...tableHeadCell, textAlign: 'right' }}>
                  Сделок
                </th>
                <th style={{ ...tableHeadCell, textAlign: 'right' }}>
                  Выручка
                </th>
              </tr>
            </thead>
            <tbody>
              {dealTypeOrder.map(({ type, label }) => {
                const stats = getDealStats(byDealType, type);
                return (
                  <tr key={type}>
                    <td style={tableRowCellLeft}>{label}</td>
                    <td style={tableRowCellRight}>{stats.count}</td>
                    <td style={tableRowCellRight}>
                      {fmtMoney(stats.revenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Менеджеры */}
        <div style={{ ...sectionCard, flex: '1 1 320px' }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>
            Производительность менеджеров
          </h2>

          {byManager.length === 0 ? (
            <p
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--nh-text-muted)',
              }}
            >
              За выбранный период нет сделок.
            </p>
          ) : (
            <div style={{ marginTop: 6 }}>
              {byManager.map((m: ManagerRow) => {
                const share =
                  totalManagerRevenue > 0
                    ? (m.revenue / totalManagerRevenue) * 100
                    : 0;

                return (
                  <div
                    key={m.managerId}
                    style={{ marginBottom: 10, paddingBottom: 2 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        marginBottom: 2,
                      }}
                    >
                      <span>{m.managerName}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(m.revenue)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: 'var(--nh-bg-main)',
                        overflow: 'hidden',
                        border: '1px solid var(--nh-border-subtle)',
                      }}
                    >
                      <div
                        style={{
                          width: `${share || 0}%`,
                          height: '100%',
                          background:
                            'linear-gradient(to right, #22c55e, #a3e635)',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.7,
                        color: 'var(--nh-text-muted)',
                        marginTop: 2,
                      }}
                    >
                      Сделок: {m.dealsCount}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
