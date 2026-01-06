import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Дублируем тип ролей как в AuthContext
type UserRole = 'ADMIN' | 'MANAGER' | 'SALES_HEAD' | 'LEGAL' | 'VIEWER';

interface NavItem {
  label: string;
  to: string;
  roles?: UserRole[]; // если не указано — видно всем авторизованным
}

const navItems: NavItem[] = [
  // Дашборд и отчёты — только для ADMIN и SALES_HEAD
  { label: 'Dashboard', to: '/', roles: ['ADMIN', 'SALES_HEAD'] },

  // Объекты и сделки — всем рабочим ролям (VIEWER тоже может смотреть)
  { label: 'Объекты', to: '/units' },
  { label: 'Сделки', to: '/deals' },

  // Клиенты — всем, кто работает с продажами/юридическим
  { label: 'Клиенты', to: '/clients' },

  // Отчёты — только руководству
  { label: 'Отчёты', to: '/reports', roles: ['ADMIN', 'SALES_HEAD'] },

  // Документы — юристы + руководство
  {
    label: 'Документы',
    to: '/documents',
    roles: ['ADMIN', 'SALES_HEAD', 'LEGAL'],
  },

  // Пользователи — только ADMIN и SALES_HEAD
  {
    label: 'Пользователи',
    to: '/users',
    roles: ['ADMIN', 'SALES_HEAD'],
  },

  // 3D-модели (админ-раздел) — только ADMIN
  {
    label: '3D-модели',
    to: '/projects-3d',
    roles: ['ADMIN'],
  },

  // 3D Viewer — всем
  { label: '3D Viewer', to: '/viewer' },
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Фильтруем пункты меню по роли пользователя
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!user) return false;
    return item.roles.includes(user.role as UserRole);
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>NewHorizonBuild CRM</h1>

        <nav className="nav-links">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 16,
            borderTop: '1px solid rgba(148,163,184,0.4)',
            fontSize: 13,
            color: '#cbd5f5',
          }}
        >
          {user && (
            <>
              <div style={{ marginBottom: 4, fontWeight: 600 }}>
                {user.fullName}
              </div>
              <div
                style={{
                  marginBottom: 10,
                  fontSize: 12,
                  opacity: 0.8,
                }}
              >
                Роль: {user.role}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 999,
              border: 'none',
              background: '#ef4444',
              color: '#f9fafb',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
