// admin/src/pages/Users.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchUsers,
  createUser,
  updateUserRole,
  UserItem,
  UserRole,
  ALL_ROLES,
  ROLE_LABELS,
} from '../api/users';

const containerStyle: React.CSSProperties = {
  padding: '0 24px 32px',
  maxWidth: 1180,
  margin: '0 auto',
  color: 'var(--nh-text-main)',
};

const sectionCard: React.CSSProperties = {
  marginTop: 8,
  padding: 18,
  borderRadius: 16,
  border: '1px solid var(--nh-border-subtle)',
  background:
    'radial-gradient(circle at top left, var(--nh-accent-soft), transparent 55%), var(--nh-bg-elevated)',
  color: 'var(--nh-text-main)',
  boxShadow: '0 14px 32px rgba(15,23,42,0.35)',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid var(--nh-border-subtle)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--nh-text-muted)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid rgba(148,163,184,0.18)',
  fontSize: 13,
  color: 'var(--nh-text-main)',
  verticalAlign: 'middle',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid var(--nh-border-subtle)',
  backgroundColor: 'var(--nh-bg-main)',
  color: 'var(--nh-text-main)',
  fontSize: 13,
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  minWidth: 220,
  padding: '6px 10px',
  borderRadius: 999,
  border: '1px solid var(--nh-border-subtle)',
  backgroundColor: 'var(--nh-bg-main)',
  color: 'var(--nh-text-main)',
  fontSize: 13,
  outline: 'none',
};

const metricCardStyle: React.CSSProperties = {
  borderRadius: 14,
  padding: '14px 16px',
  border: '1px solid rgba(148,163,184,0.22)',
  background: 'rgba(255,255,255,0.03)',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU');
}

function getRoleTone(role: UserRole): {
  background: string;
  color: string;
} {
  switch (role) {
    case 'ADMIN':
      return { background: 'rgba(239,68,68,0.14)', color: '#b91c1c' };
    case 'SALES_HEAD':
      return { background: 'rgba(59,130,246,0.14)', color: '#1d4ed8' };
    case 'MANAGER':
      return { background: 'rgba(34,197,94,0.14)', color: '#15803d' };
    case 'LEGAL':
      return { background: 'rgba(168,85,247,0.14)', color: '#7c3aed' };
    case 'VIEWER':
      return { background: 'rgba(148,163,184,0.18)', color: '#475569' };
    default:
      return { background: 'rgba(148,163,184,0.18)', color: '#475569' };
  }
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('MANAGER');
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Неизвестная ошибка при загрузке пользователей');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleChangeRole = async (userId: string, newRoleValue: UserRole) => {
    try {
      setSavingId(userId);
      setPageMessage(null);

      const updated = await updateUserRole(userId, newRoleValue);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setPageMessage('Роль пользователя обновлена');
    } catch (err) {
      if (err instanceof Error) {
        setPageMessage(err.message);
      } else {
        setPageMessage('Ошибка при изменении роли');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateUser = async () => {
    try {
      setCreating(true);
      setPageMessage(null);

      const created = await createUser({
        email: newEmail,
        fullName: newFullName,
        password: newPassword,
        role: newRole,
      });

      setUsers((prev) => [created, ...prev]);
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      setNewRole('MANAGER');
      setPageMessage('Пользователь создан');
    } catch (err) {
      if (err instanceof Error) {
        setPageMessage(err.message);
      } else {
        setPageMessage('Ошибка при создании пользователя');
      }
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        ROLE_LABELS[u.role].toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const counters = useMemo(() => {
    const byRole: Record<UserRole, number> = {
      ADMIN: 0,
      MANAGER: 0,
      SALES_HEAD: 0,
      LEGAL: 0,
      VIEWER: 0,
    };

    for (const user of users) {
      byRole[user.role] += 1;
    }

    return {
      total: users.length,
      byRole,
    };
  }, [users]);

  if (loading && !users.length) {
    return (
      <div style={{ padding: 24, color: 'var(--nh-text-main)' }}>
        Загрузка пользователей...
      </div>
    );
  }

  if (error && !users.length) {
    return (
      <div style={{ padding: 24, color: 'var(--nh-text-main)' }}>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Пользователи</h1>
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
          Администрирование
        </div>
        <h1
          style={{
            margin: '4px 0 4px',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Пользователи
        </h1>
        <div
          style={{
            fontSize: 13,
            opacity: 0.75,
            color: 'var(--nh-text-muted)',
          }}
        >
          Реестр сотрудников CRM
        </div>
      </header>

      <section style={sectionCard}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(150px, 1fr))',
            gap: 12,
          }}
        >
          <div style={metricCardStyle}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              Всего
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {counters.total}
            </div>
          </div>

          {ALL_ROLES.map((role) => {
            const tone = getRoleTone(role);
            return (
              <div key={role} style={metricCardStyle}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                  {ROLE_LABELS[role]}
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: tone.background,
                    color: tone.color,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {counters.byRole[role]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section style={sectionCard}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          Создать пользователя
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                marginBottom: 6,
              }}
            >
              ФИО
            </div>
            <input
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="Иванов Иван"
              style={inputStyle}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                marginBottom: 6,
              }}
            >
              Email
            </div>
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              style={inputStyle}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                marginBottom: 6,
              }}
            >
              Пароль
            </div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              style={inputStyle}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                marginBottom: 6,
              }}
            >
              Роль
            </div>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              style={{ ...selectStyle, width: '100%' }}
            >
              {ALL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() => void handleCreateUser()}
            disabled={creating}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {creating ? 'Создание...' : 'Создать пользователя'}
          </button>
        </div>

        {pageMessage && (
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'var(--nh-text-main)',
              opacity: 0.82,
            }}
          >
            {pageMessage}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'var(--nh-danger)',
            }}
          >
            {error}
          </div>
        )}
      </section>

      <section style={sectionCard}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <label
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Поиск по ФИО, email или роли
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Например: manager, admin@..., Иванов"
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => void loadUsers()}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid var(--nh-border-subtle)',
                background: 'transparent',
                color: 'var(--nh-text-main)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Обновить
            </button>
          </div>
        </div>
      </section>

      <section style={sectionCard}>
        {filteredUsers.length === 0 ? (
          <p style={{ fontSize: 14 }}>
            Пользователи не найдены.
          </p>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table
              style={{
                borderCollapse: 'collapse',
                marginTop: 4,
                minWidth: 860,
                width: '100%',
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>ФИО</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Текущая роль</th>
                  <th style={thStyle}>Сменить роль</th>
                  <th style={thStyle}>Создан</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const tone = getRoleTone(u.role);

                  return (
                    <tr key={u.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--nh-text-muted)',
                            marginTop: 3,
                          }}
                        >
                          ID: {u.id}
                        </div>
                      </td>

                      <td style={tdStyle}>{u.email}</td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-flex',
                            padding: '5px 10px',
                            borderRadius: 999,
                            background: tone.background,
                            color: tone.color,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleChangeRole(
                              u.id,
                              e.target.value as UserRole,
                            )
                          }
                          disabled={savingId === u.id}
                          style={selectStyle}
                        >
                          {ALL_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>

                        {savingId === u.id && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 11,
                              color: 'var(--nh-text-muted)',
                            }}
                          >
                            Сохранение...
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>{formatDate(u.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default UsersPage;