import { FormEvent, useEffect, useState } from 'react';
import { fetchSalesReport, SalesReport } from '../api/reports';

const Reports = () => {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadReport = async (params?: { from?: string; to?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSalesReport(params);
      setReport(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Неизвестная ошибка');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    loadReport({ from: from || undefined, to: to || undefined });
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>Отчёты</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: '16px' }}>
        <div>
          <label>
            С:
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
        </div>
        <div>
          <label>
            По:
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <button type="submit">Обновить</button>
      </form>
      {report && (
        <div>
          <div>Всего сделок: {report.totalDeals}</div>
          <div>Общая выручка: {report.totalRevenue}</div>
        </div>
      )}
    </div>
  );
};

export default Reports;
