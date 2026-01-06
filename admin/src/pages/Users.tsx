// admin/src/pages/Users.tsx
import { useEffect, useState } from 'react';
import {
  fetchUsers,
  updateUserRole,
  UserItem,
  UserRole,
  ALL_ROLES,
  ROLE_LABELS,
} from '../api/users';

const UsersPage = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      setSavingId(userId);
      const updated = await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? updated : u)),
      );
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ошибка при изменении роли');
      }
    } finally {
      setSavingId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString();
  };

  if (loading) {
    return <div>Загрузка пользователей...</div>;
  }

  if (error) {
    return <div>Ошибка: {error}</div>;
  }

  return (
    <div style={{ paddingRight: 24 }}>
      <h1>Пользователи</h1>

      {users.length === 0 ? (
        <p>Пользователей пока нет.</p>
      ) : (
        <table
          style={{
            borderCollapse: 'collapse',
            marginTop: 16,
            minWidth: 720,
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                ФИО
              </th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                Email
              </th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                Роль
              </th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                Создан
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td
                  style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {u.fullName}
                </td>
                <td
                  style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {u.email}
                </td>
                <td
                  style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <select
                    value={u.role}
                    onChange={(e) =>
                      handleChangeRole(
                        u.id,
                        e.target.value as UserRole,
                      )
                    }
                    disabled={savingId === u.id}
                    style={{ minWidth: 220 }}
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td
                  style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {formatDate(u.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
        Управление ролями доступно только пользователям с ролями
        ADMIN и SALES_HEAD. Остальные увидят ошибку доступа при
        попытке зайти на эту страницу или дернуть API.
      </p>
    </div>
  );
};

export default UsersPage;
