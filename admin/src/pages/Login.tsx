import React, { FormEvent, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Login: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@newhorizon.kz');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Если уже залогинен и пришёл на /login — отправляем на объекты
  useEffect(() => {
    if (user) {
      navigate('/units', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/units', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#f9fafb',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '32px 28px',
          borderRadius: 16,
          background: '#020617',
          boxShadow: '0 25px 50px -12px rgba(15,23,42,0.8)',
          border: '1px solid rgba(148,163,184,0.3)',
        }}
      >
        <h1
          style={{
            fontSize: 24,
            marginBottom: 8,
            fontWeight: 700,
          }}
        >
          NewHorizonBuild CRM
        </h1>
        <p
          style={{
            fontSize: 14,
            marginBottom: 24,
            color: '#9ca3af',
          }}
        >
          Войдите в систему, чтобы работать с объектами и сделками.
        </p>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.1)',
              color: '#fecaca',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #4b5563',
                background: '#020617',
                color: '#f9fafb',
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #4b5563',
                background: '#020617',
                color: '#f9fafb',
                fontSize: 14,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 999,
              border: 'none',
              background: loading ? '#1e293b' : '#2563eb',
              color: '#f9fafb',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>

          <p
            style={{
              marginTop: 12,
              fontSize: 12,
              color: '#6b7280',
            }}
          >
            Для демо входа можно использовать:{' '}
            <strong>admin@newhorizon.kz / admin123</strong>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
