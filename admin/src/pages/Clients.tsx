// admin/src/pages/Clients.tsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Client, fetchClients } from '../api/clients';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // фокус для перехода из глобального поиска
  const [focusedClientId, setFocusedClientId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

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

    void load();
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

  // Подсветка и скролл к клиенту, если пришли с focusClientId из глобального поиска
  useEffect(() => {
    const state = (location.state as any) || {};
    if (!state.focusClientId) return;

    const id = String(state.focusClientId);
    setFocusedClientId(id);

    const timeoutId = window.setTimeout(() => {
      const row = rowRefs.current[id];
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
  }, [location.state, filtered]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU');

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

  const handleRowClick = (client: Client) => {
    navigate(`/clients/${client.id}`, {
      state: { client },
    });
  };

  if (loading && !clients.length) {
    return (
      <div style={{ padding: 24, color: 'var(--nh-text-main)' }}>
        Загрузка клиентов...
      </div>
    );
  }

  if (error && !clients.length) {
    return (
      <div style={{ padding: 24, color: 'var(--nh-text-main)' }}>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>Клиенты</h1>
        <div style={{ color: 'var(--nh-danger)' }}>Ошибка: {error}</div>
      </div>
    );
  }

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
          База контактов
        </div>
        <h1
          style={{
            margin: '4px 0 4px',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Клиенты
        </h1>
        <div
          style={{
            fontSize: 13,
            opacity: 0.75,
            color: 'var(--nh-text-muted)',
          }}
        >
          Всего клиентов: {clients.length}. В выборке: {filtered.length}
        </div>
      </header>

      {/* Поиск */}
      <section style={sectionCard}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <label
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Поиск по имени, телефону или email
            </label>
            <input
              type="text"
              placeholder="Начните вводить ФИО, номер или email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                ...inputBase,
                width: '100%',
              }}
            />
          </div>

          {loading && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                marginTop: 18,
              }}
            >
              Обновление списка клиентов…
            </div>
          )}
          {error && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--nh-danger)',
                marginTop: 18,
              }}
            >
              Ошибка: {error}
            </div>
          )}
        </div>
      </section>

      {/* Таблица клиентов */}
      <section style={sectionCard}>
        <div
          style={{
            fontSize: 13,
            marginBottom: 8,
            color: 'var(--nh-text-muted)',
          }}
        >
          Реестр клиентов
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 800,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Имя</th>
                <th style={thStyle}>Телефон</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Кол-во сделок</th>
                <th style={thStyle}>Создан</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan={5}>
                    Клиенты не найдены. Попробуйте изменить запрос.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    ref={(el) => {
                      rowRefs.current[String(c.id)] = el;
                    }}
                    onClick={() => handleRowClick(c)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor:
                        String(c.id) === focusedClientId
                          ? 'rgba(56,189,248,0.14)'
                          : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={tdStyle}>{c.fullName}</td>
                    <td style={tdStyle}>{c.phone}</td>
                    <td style={tdStyle}>{c.email ?? '—'}</td>
                    <td style={tdStyle}>{c.deals.length}</td>
                    <td style={tdStyle}>{fmtDate(c.createdAt)}</td>
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

export default Clients;
