// admin/src/pages/Reports.tsx
import { FormEvent, useState, type CSSProperties } from 'react';
import {
  SalesReport,
  fetchSalesReport,
  DealType,
  UnitType,
} from '../api/reports';

const DEAL_TYPES: DealType[] = ['SALE', 'INSTALLMENT', 'EQUITY'];
const UNIT_TYPES: UnitType[] = ['APARTMENT', 'COMMERCIAL', 'PARKING'];

const dealTypeLabels: Record<DealType, string> = {
  SALE: 'Продажа',
  INSTALLMENT: 'Рассрочка',
  EQUITY: 'Долевое участие',
};

const unitTypeLabels: Record<UnitType, string> = {
  APARTMENT: 'Квартиры',
  COMMERCIAL: 'Коммерческая',
  PARKING: 'Паркинг',
};

type PresetId =
  | 'CUSTOM'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_YEAR';

const containerStyle: CSSProperties = {
  padding: '0 24px 32px',
  maxWidth: 1280,
  margin: '0 auto',
  color: 'var(--nh-text-main)',
};

const presetButton = (active: boolean): CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 999,
  border: active
    ? '1px solid var(--nh-accent)'
    : '1px solid var(--nh-border-subtle)',
  backgroundColor: active
    ? 'var(--nh-accent-soft)'
    : 'var(--nh-bg-elevated)',
  cursor: 'pointer',
  fontSize: 12,
  color: active ? 'var(--nh-accent)' : 'var(--nh-text-main)',
  fontWeight: active ? 600 : 400,
});

const card: CSSProperties = {
  marginTop: 16,
  padding: 18,
  borderRadius: 16,
  border: '1px solid var(--nh-border-subtle)',
  background:
    'radial-gradient(circle at top left, var(--nh-accent-soft), transparent 55%), var(--nh-bg-elevated)',
  color: 'var(--nh-text-main)',
  boxShadow: '0 14px 32px rgba(15,23,42,0.35)',
};

const cardTitle: CSSProperties = {
  margin: 0,
  marginBottom: 8,
  fontSize: 18,
  fontWeight: 600,
};

const tableHeadCell: CSSProperties = {
  borderBottom: '1px solid var(--nh-border-subtle)',
  padding: '6px 8px',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'left',
  color: 'var(--nh-text-muted)',
};

const tableHeadCellRight: CSSProperties = {
  ...tableHeadCell,
  textAlign: 'right',
};

const tableCell: CSSProperties = {
  borderBottom: '1px solid rgba(148,163,184,0.2)',
  padding: '6px 8px',
  fontSize: 13,
  color: 'var(--nh-text-main)',
};

const tableCellRight: CSSProperties = {
  ...tableCell,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const summaryNumber: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
};

const summaryLabel: CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
  color: 'var(--nh-text-muted)',
};

const inputBase: CSSProperties = {
  padding: '4px 8px',
  borderRadius: 999,
  border: '1px solid var(--nh-border-subtle)',
  backgroundColor: 'var(--nh-bg-main)',
  color: 'var(--nh-text-main)',
  fontSize: 13,
  outline: 'none',
};

const Reports: React.FC = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<PresetId>('CUSTOM');

  const formatMoney = (value: number) =>
    value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });

  const formatLocalDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )}`;
  };

  const runReport = async (params: { from?: string; to?: string }) => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const data = await fetchSalesReport(params);
      setReport(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось построить отчёт по продажам',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setActivePreset('CUSTOM');

    await runReport({
      from: from || undefined,
      to: to || undefined,
    });
  };

  const applyPreset = async (preset: PresetId) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    let presetFrom = '';
    let presetTo = formatLocalDate(now); // по умолчанию до сегодня

    if (preset === 'THIS_MONTH') {
      const start = new Date(year, month, 1);
      presetFrom = formatLocalDate(start);
    }

    if (preset === 'LAST_MONTH') {
      const prevMonth = month - 1;
      const start = new Date(year, prevMonth, 1);
      const end = new Date(year, month, 0); // 0-й день текущего месяца = последний день прошлого
      presetFrom = formatLocalDate(start);
      presetTo = formatLocalDate(end);
    }

    if (preset === 'THIS_QUARTER') {
      const quarter = Math.floor(month / 3);
      const startMonth = quarter * 3;
      const start = new Date(year, startMonth, 1);
      presetFrom = formatLocalDate(start);
      // по сегодня (presetTo уже стоит)
    }

    if (preset === 'THIS_YEAR') {
      const start = new Date(year, 0, 1);
      presetFrom = formatLocalDate(start);
      // по сегодня (presetTo уже стоит)
    }

    // fallback на всякий случай (для неожиданного кейса)
    if (!presetFrom) {
      const start = new Date(year, month, 1);
      presetFrom = formatLocalDate(start);
    }

    setFrom(presetFrom);
    setTo(presetTo);
    setActivePreset(preset);

    await runReport({
      from: presetFrom,
      to: presetTo,
    });
  };

  const periodLabel =
    from || to
      ? `Период: ${from || '—'} — ${to || '—'}`
      : 'Период не выбран';

  const avgCheck =
    report && report.totalDeals > 0
      ? Math.round(report.totalRevenue / report.totalDeals)
      : 0;

  const totalsByUnit =
    report &&
    UNIT_TYPES.reduce(
      (acc, type) => {
        const row = report.byUnitType[type];
        if (!row) return acc;
        return {
          deals: acc.deals + row.count,
          revenue: acc.revenue + row.revenue,
        };
      },
      { deals: 0, revenue: 0 },
    );

  const totalsByDealType =
    report &&
    DEAL_TYPES.reduce(
      (acc, type) => {
        const row = report.byDealType[type];
        if (!row) return acc;
        return {
          deals: acc.deals + row.count,
          revenue: acc.revenue + row.revenue,
        };
      },
      { deals: 0, revenue: 0 },
    );

  const totalManagerRevenue =
    report?.byManager.reduce((acc, m) => acc + m.revenue, 0) ?? 0;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={{ margin: '4px 0 16px' }}>
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            opacity: 0.6,
            color: 'var(--nh-text-muted)',
          }}
        >
          Аналитика и отчёты
        </div>
        <h1
          style={{
            margin: '4px 0 4px',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Отчёты по продажам
        </h1>
        <div
          style={{
            fontSize: 13,
            opacity: 0.75,
            color: 'var(--nh-text-muted)',
          }}
        >
          {periodLabel}
        </div>
      </header>

      {/* Пресеты периода */}
      <section
        style={{
          ...card,
          marginTop: 0,
          paddingBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: 'var(--nh-text-muted)',
            marginBottom: 10,
          }}
        >
          Быстрый выбор периода
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 10,
          }}
        >
          <button
            type="button"
            onClick={() => applyPreset('THIS_MONTH')}
            style={presetButton(activePreset === 'THIS_MONTH')}
          >
            Этот месяц
          </button>

          <button
            type="button"
            onClick={() => applyPreset('LAST_MONTH')}
            style={presetButton(activePreset === 'LAST_MONTH')}
          >
            Прошлый месяц
          </button>

          <button
            type="button"
            onClick={() => applyPreset('THIS_QUARTER')}
            style={presetButton(activePreset === 'THIS_QUARTER')}
          >
            Этот квартал
          </button>

          <button
            type="button"
            onClick={() => applyPreset('THIS_YEAR')}
            style={presetButton(activePreset === 'THIS_YEAR')}
          >
            Этот год
          </button>
        </div>

        {/* Ручной выбор периода */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: 4,
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: 'var(--nh-text-muted)',
            }}
          >
            Период с:
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setActivePreset('CUSTOM');
              }}
              style={{
                ...inputBase,
                marginLeft: 6,
              }}
            />
          </label>

          <label
            style={{
              fontSize: 13,
              color: 'var(--nh-text-muted)',
            }}
          >
            по:
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setActivePreset('CUSTOM');
              }}
              style={{
                ...inputBase,
                marginLeft: 6,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '7px 16px',
              borderRadius: 999,
              border: 'none',
              background: 'var(--nh-accent)',
              color: '#f9fafb',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Строим отчёт...' : 'Построить отчёт'}
          </button>
        </form>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 10,
              background:
                'linear-gradient(to right, rgba(248,113,113,0.1), rgba(248,113,113,0.02))',
              border: '1px solid rgba(248,113,113,0.4)',
              fontSize: 13,
              color: 'var(--nh-danger)',
            }}
          >
            Ошибка: {error}
          </div>
        )}

        {!report && !error && !loading && (
          <p
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'var(--nh-text-muted)',
            }}
          >
            Выберите период (или пресет выше) и нажмите «Построить отчёт».
          </p>
        )}
      </section>

      {report && (
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Сводка */}
          <section style={card}>
            <h2 style={cardTitle}>Сводка</h2>
            {report.totalDeals === 0 ? (
              <p style={{ fontSize: 14 }}>
                За выбранный период сделок нет.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  flexWrap: 'wrap',
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid var(--nh-border-subtle)',
                    minWidth: 180,
                    backgroundColor: 'var(--nh-bg-main)',
                  }}
                >
                  <div style={summaryLabel}>Всего сделок</div>
                  <div style={summaryNumber}>{report.totalDeals}</div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid var(--nh-border-subtle)',
                    minWidth: 220,
                    backgroundColor: 'var(--nh-bg-main)',
                  }}
                >
                  <div style={summaryLabel}>Общая выручка</div>
                  <div style={summaryNumber}>
                    {formatMoney(report.totalRevenue)} сом
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid var(--nh-border-subtle)',
                    minWidth: 220,
                    backgroundColor: 'var(--nh-bg-main)',
                  }}
                >
                  <div style={summaryLabel}>Средний чек</div>
                  <div style={summaryNumber}>
                    {report.totalDeals > 0
                      ? `${formatMoney(avgCheck)} сом`
                      : '—'}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Разбивка по типу недвижимости */}
          <section style={card}>
            <h2 style={cardTitle}>Разбивка по типу недвижимости</h2>
            <table
              style={{
                borderCollapse: 'collapse',
                marginTop: 8,
                minWidth: 400,
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeadCell}>Тип</th>
                  <th style={tableHeadCellRight}>Сделок</th>
                  <th style={tableHeadCellRight}>Выручка</th>
                </tr>
              </thead>
              <tbody>
                {UNIT_TYPES.map((type) => {
                  const row = report.byUnitType[type];
                  if (!row) return null;
                  return (
                    <tr key={type}>
                      <td style={tableCell}>{unitTypeLabels[type]}</td>
                      <td style={tableCellRight}>{row.count}</td>
                      <td style={tableCellRight}>
                        {formatMoney(row.revenue)} сом
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totalsByUnit && totalsByUnit.deals > 0 && (
                <tfoot>
                  <tr>
                    <td
                      style={{
                        ...tableCell,
                        fontWeight: 600,
                      }}
                    >
                      Итого
                    </td>
                    <td
                      style={{
                        ...tableCellRight,
                        fontWeight: 600,
                      }}
                    >
                      {totalsByUnit.deals}
                    </td>
                    <td
                      style={{
                        ...tableCellRight,
                        fontWeight: 600,
                      }}
                    >
                      {formatMoney(totalsByUnit.revenue)} сом
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </section>

          {/* Разбивка по типу сделки */}
          <section style={card}>
            <h2 style={cardTitle}>Разбивка по типу сделки</h2>
            <table
              style={{
                borderCollapse: 'collapse',
                marginTop: 8,
                minWidth: 400,
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeadCell}>Тип сделки</th>
                  <th style={tableHeadCellRight}>Сделок</th>
                  <th style={tableHeadCellRight}>Выручка</th>
                </tr>
              </thead>
              <tbody>
                {DEAL_TYPES.map((type) => {
                  const row = report.byDealType[type];
                  if (!row) return null;
                  return (
                    <tr key={type}>
                      <td style={tableCell}>{dealTypeLabels[type]}</td>
                      <td style={tableCellRight}>{row.count}</td>
                      <td style={tableCellRight}>
                        {formatMoney(row.revenue)} сом
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totalsByDealType && totalsByDealType.deals > 0 && (
                <tfoot>
                  <tr>
                    <td
                      style={{
                        ...tableCell,
                        fontWeight: 600,
                      }}
                    >
                      Итого
                    </td>
                    <td
                      style={{
                        ...tableCellRight,
                        fontWeight: 600,
                      }}
                    >
                      {totalsByDealType.deals}
                    </td>
                    <td
                      style={{
                        ...tableCellRight,
                        fontWeight: 600,
                      }}
                    >
                      {formatMoney(totalsByDealType.revenue)} сом
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </section>

          {/* Производительность менеджеров */}
          <section style={card}>
            <h2 style={cardTitle}>Производительность менеджеров</h2>
            {report.byManager.length === 0 ? (
              <p style={{ fontSize: 14 }}>
                За выбранный период нет сделок по менеджерам.
              </p>
            ) : (
              <table
                style={{
                  borderCollapse: 'collapse',
                  marginTop: 8,
                  minWidth: 500,
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeadCell}>Менеджер</th>
                    <th style={tableHeadCellRight}>Сделок</th>
                    <th style={tableHeadCellRight}>Выручка</th>
                    <th style={tableHeadCellRight}>Доля выручки</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byManager.map((m) => {
                    const share =
                      totalManagerRevenue > 0
                        ? (m.revenue / totalManagerRevenue) * 100
                        : 0;

                    return (
                      <tr key={m.managerId}>
                        <td style={tableCell}>{m.managerName}</td>
                        <td style={tableCellRight}>{m.dealsCount}</td>
                        <td style={tableCellRight}>
                          {formatMoney(m.revenue)} сом
                        </td>
                        <td style={tableCellRight}>
                          {share > 0 ? `${share.toFixed(1)}%` : '0%'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Reports;
