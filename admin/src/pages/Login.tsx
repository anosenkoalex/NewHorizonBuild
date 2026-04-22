import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Login: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@newhorizon.kz');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Уже авторизованный пользователь не должен видеть логин
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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось выполнить вход. Попробуй ещё раз.');
      }
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
        padding: '32px 16px',
        background:
          'radial-gradient(circle at top, rgba(56,189,248,0.14), transparent 55%), radial-gradient(circle at bottom, rgba(59,130,246,0.18), transparent 60%), var(--nh-bg-main, #020617)',
        color: 'var(--nh-text-main, #e5e7eb)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
          gap: 32,
          alignItems: 'center',
        }}
      >
        {/* Левая часть — бренд / описание CRM */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.45)',
              background:
                'linear-gradient(to right, rgba(15,23,42,0.9), rgba(15,23,42,0.6))',
              backdropFilter: 'blur(10px)',
              width: 'fit-content',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background:
                  'radial-gradient(circle at 30% 20%, #facc15, #f97316 55%, #e11d48 90%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#020617',
              }}
            >
              NH
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: 'var(--nh-text-muted, #9ca3af)',
                }}
              >
                CRM застройщика
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                NewHorizonBuild
              </div>
            </div>
          </div>

          <h1
            style={{
              margin: '8px 0 4px',
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            Панель управления продажами и объектами
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              maxWidth: 420,
              color: 'var(--nh-text-muted, #9ca3af)',
            }}
          >
            Веди сделки, управляй статусами юнитов, загружай документы и
            подключай 3D-модели объектов в одном рабочем пространстве.
          </p>
        </div>

        {/* Правая часть — карточка логина */}
        <div
          style={{
            borderRadius: 18,
            border: '1px solid var(--nh-border-subtle, rgba(148,163,184,0.45))',
            background:
              'radial-gradient(circle at top left, rgba(248,250,252,0.04), transparent 60%), rgba(15,23,42,0.92)',
            boxShadow: '0 24px 60px rgba(15,23,42,0.9)',
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 6,
              color: 'var(--nh-text-muted, #9ca3af)',
            }}
          >
            Вход в систему
          </div>
          <h2
            style={{
              margin: '0 0 16px',
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            NewHorizonBuild CRM
          </h2>

          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid rgba(248,113,113,0.5)',
                background:
                  'linear-gradient(to right, rgba(248,113,113,0.12), rgba(248,113,113,0.03))',
                color: '#fecaca',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                fontSize: 13,
              }}
            >
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border:
                    '1px solid var(--nh-border-subtle, rgba(148,163,184,0.55))',
                  backgroundColor: 'var(--nh-bg-main, #020617)',
                  color: 'var(--nh-text-main, #e5e7eb)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                fontSize: 13,
              }}
            >
              Пароль
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border:
                    '1px solid var(--nh-border-subtle, rgba(148,163,184,0.55))',
                  backgroundColor: 'var(--nh-bg-main, #020617)',
                  color: 'var(--nh-text-main, #e5e7eb)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '9px 14px',
                borderRadius: 999,
                border: 'none',
                background:
                  'linear-gradient(to right, var(--nh-accent, #22c55e), #14b8a6)',
                color: '#f9fafb',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: '0 10px 30px rgba(16,185,129,0.45)',
                transform: loading ? 'none' : 'translateY(0)',
                transition:
                  'transform 0.08s ease, box-shadow 0.12s ease, filter 0.12s ease',
              }}
            >
              {loading ? 'Входим…' : 'Войти'}
            </button>

            <p
              style={{
                margin: 6,
                fontSize: 12,
                color: 'var(--nh-text-muted, #9ca3af)',
              }}
            >
              Для демо входа можно использовать:{' '}
              <strong>admin@newhorizon.kz / admin123</strong>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
