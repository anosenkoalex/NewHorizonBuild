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
      // Для кастомного периода используем то, что ввёл пользователь
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
      const month = now.getMonth(); // 0–11
      const quarterIndex = Math.floor(month / 3); // 0,1,2,3
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
    // Перезапрашиваем данные при смене пресета или дат
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

  const cardStyle: React.CSSProperties = {
    flex: '1 1 240px',
    padding: '16px 20px',
    borderRadius: 12,
    backgroundColor: '#0f172a',
    color: 'white',
    boxShadow: '0 8px 20px rgba(15,23,42,0.35)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 4,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 600,
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
    gap: 12,
    margin: '16px 0 8px',
    flexWrap: 'wrap',
  };

  const pillBase: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: 13,
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
          backgroundColor: active ? '#0f172a' : '#f8fafc',
          color: active ? '#ffffff' : '#0f172a',
          borderColor: active ? '#0f172a' : '#cbd5e1',
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

  return (
    <div style={{ paddingRight: 24 }}>
      <h1>NewHorizonBuild CRM — Dashboard</h1>

      {/* Блок выбора периода */}
      <section>
        <div style={periodControlsWrapper}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Период:</span>
          {periodButton('YEAR', 'Этот год')}
          {periodButton('QUARTER', 'Этот квартал')}
          {periodButton('MONTH', 'Этот месяц')}
          {periodButton('CUSTOM', 'Произвольный')}
        </div>

        {period === 'CUSTOM' && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 8,
            }}
          >
            <label style={{ fontSize: 13 }}>
              C:{' '}
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 13 }}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              По:{' '}
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 13 }}
              />
            </label>
            <button
              type="button"
              onClick={loadData}
              style={{
                ...pillBase,
                backgroundColor: '#0f172a',
                color: '#ffffff',
                borderColor: '#0f172a',
              }}
            >
              Обновить
            </button>
          </div>
        )}

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          Выбранный период: {currentPeriodLabel}
          {from && to ? ` (${from} — ${to})` : null}
        </div>

        {loading && data && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>Обновляем данные…</div>
        )}
        {error && data && (
          <div style={{ fontSize: 12, color: '#b91c1c' }}>
            Ошибка при обновлении: {error}
          </div>
        )}
      </section>

      {/* Верхние карточки */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          margin: '20px 0 32px',
          flexWrap: 'wrap',
        }}
      >
        <div style={cardStyle}>
          <div style={labelStyle}>Всего объектов</div>
          <div style={valueStyle}>
            {summary ? fmtNumber(totalUnits) : '—'}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Сделок за период</div>
          <div style={valueStyle}>{totalDeals}</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Общая выручка</div>
          <div style={valueStyle}>{fmtMoney(totalRevenue)}</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Продано квартир</div>
          <div style={valueStyle}>{apartments.count}</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Продано коммерческих объектов</div>
          <div style={valueStyle}>{commercial.count}</div>
        </div>
      </div>

      {/* Статусы объектов */}
      <section style={{ marginBottom: 32 }}>
        <h2>Статусы объектов</h2>

        {!summary && summaryError && (
          <p style={{ marginTop: 8, color: '#b91c1c', fontSize: 13 }}>
            {summaryError}
          </p>
        )}

        {summary && totalUnitsForBar && totalUnitsForBar > 0 && (
          <div
            style={{
              marginTop: 12,
              marginBottom: 12,
              height: 18,
              borderRadius: 999,
              overflow: 'hidden',
              display: 'flex',
              backgroundColor: '#e5e7eb',
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
        )}

        {summary && (
          <table style={{ borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                  Статус
                </th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>
                  Кол-во
                </th>
              </tr>
            </thead>
            <tbody>
              {statusOrder.map(({ status, label }) => (
                <tr key={status}>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {unitsByStatus?.[status] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!summary && !summaryError && (
          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>
            Загрузка сводки по объектам…
          </p>
        )}
      </section>

      {/* Разбивка по типу недвижимости */}
      <section style={{ marginBottom: 32 }}>
        <h2>Разбивка по типу недвижимости</h2>
        <table style={{ borderCollapse: 'collapse', marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Тип</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Сделок</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>
                Выручка
              </th>
            </tr>
          </thead>
          <tbody>
            {unitTypeOrder.map(({ type, label }) => {
              const stats = getUnitStats(byUnitType, type);
              return (
                <tr key={type}>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {stats.count}
                  </td>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {fmtMoney(stats.revenue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Разбивка по типу сделки */}
      <section style={{ marginBottom: 32 }}>
        <h2>Разбивка по типу сделки</h2>
        <table style={{ borderCollapse: 'collapse', marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                Тип сделки
              </th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Сделок</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>
                Выручка
              </th>
            </tr>
          </thead>
          <tbody>
            {dealTypeOrder.map(({ type, label }) => {
              const stats = getDealStats(byDealType, type);
              return (
                <tr key={type}>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {stats.count}
                  </td>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {fmtMoney(stats.revenue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Топ менеджеров */}
      <section>
        <h2>Производительность менеджеров</h2>
        {byManager.length === 0 ? (
          <p style={{ marginTop: 8 }}>За выбранный период нет сделок.</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                  Менеджер
                </th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>
                  Сделок
                </th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>
                  Выручка
                </th>
              </tr>
            </thead>
            <tbody>
              {byManager.map((m: ManagerRow) => (
                <tr key={m.managerId}>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                    }}
                  >
                    {m.managerName}
                  </td>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {m.dealsCount}
                  </td>
                  <td
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {fmtMoney(m.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
