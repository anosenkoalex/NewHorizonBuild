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

// немного общих стилей, чтобы страница выглядела как аккуратный дашборд
const presetButton = (active: boolean): CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 999,
  border: active ? '1px solid #2563eb' : '1px solid #e5e7eb',
  backgroundColor: active ? '#dbeafe' : '#ffffff',
  cursor: 'pointer',
  fontSize: 13,
});

const card: CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
};

const cardTitle: CSSProperties = {
  margin: 0,
  marginBottom: 8,
  fontSize: 18,
  fontWeight: 600,
};

const tableHeadCell: CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
  padding: '6px 8px',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'left',
};

const tableHeadCellRight: CSSProperties = {
  ...tableHeadCell,
  textAlign: 'right',
};

const tableCell: CSSProperties = {
  borderBottom: '1px solid #f3f4f6',
  padding: '6px 8px',
  fontSize: 13,
};

const tableCellRight: CSSProperties = {
  ...tableCell,
  textAlign: 'right',
};

const summaryNumber: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
};

const summaryLabel: CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
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
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
      // по конец сегодняшнего дня (текущая дата)
    }

    if (preset === 'THIS_YEAR') {
      const start = new Date(year, 0, 1);
      presetFrom = formatLocalDate(start);
      // по сегодня
    }

    // fallback на всякий случай
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

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0, marginBottom: 8 }}>Отчёты по продажам</h1>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        {periodLabel}
      </div>

      {/* Пресеты периода */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 12,
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
        }}
      >
        <label style={{ fontSize: 14 }}>
          Период с:
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setActivePreset('CUSTOM');
            }}
            style={{ marginLeft: 4, padding: '3px 6px' }}
          />
        </label>

        <label style={{ fontSize: 14 }}>
          по:
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setActivePreset('CUSTOM');
            }}
            style={{ marginLeft: 4, padding: '3px 6px' }}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Строим отчёт...' : 'Построить отчёт'}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            fontSize: 13,
          }}
        >
          Ошибка: {error}
        </div>
      )}

      {!report && !error && !loading && (
        <p style={{ marginTop: 16, fontSize: 14 }}>
          Выбери период (или пресет выше) и нажми «Построить отчёт».
        </p>
      )}

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
              <p style={{ fontSize: 14 }}>За выбранный период сделок нет.</p>
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
                    border: '1px solid #e5e7eb',
                    minWidth: 180,
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <div style={summaryLabel}>Всего сделок</div>
                  <div style={summaryNumber}>{report.totalDeals}</div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    minWidth: 220,
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <div style={summaryLabel}>Общая выручка</div>
                  <div style={summaryNumber}>
                    {formatMoney(report.totalRevenue)} сом
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
                  </tr>
                </thead>
                <tbody>
                  {report.byManager.map((m) => (
                    <tr key={m.managerId}>
                      <td style={tableCell}>{m.managerName}</td>
                      <td style={tableCellRight}>{m.dealsCount}</td>
                      <td style={tableCellRight}>
                        {formatMoney(m.revenue)} сом
                      </td>
                    </tr>
                  ))}
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
