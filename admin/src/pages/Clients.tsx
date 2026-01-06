import React, { useEffect, useMemo, useState } from 'react';
import { Client, fetchClients } from '../api/clients';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchClients();
        setClients(data);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Ошибка при загрузке клиентов',
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [clients, search]);

  if (loading) return <div>Загрузка клиентов...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU');

  return (
    <div>
      <h1>Клиенты</h1>

      <div style={{ margin: '16px 0' }}>
        <input
          type="text"
          placeholder="Поиск по имени, телефону или email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '6px 10px', minWidth: 280 }}
        />
      </div>

      <table>
        <thead>
          <tr>
            <th>Имя</th>
            <th>Телефон</th>
            <th>Email</th>
            <th>Кол-во сделок</th>
            <th>Создан</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c.id}>
              <td>{c.fullName}</td>
              <td>{c.phone}</td>
              <td>{c.email ?? '—'}</td>
              <td>{c.deals.length}</td>
              <td>{fmtDate(c.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Clients;
