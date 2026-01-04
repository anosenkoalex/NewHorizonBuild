import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Объекты', to: '/units' },
  { label: 'Сделки', to: '/deals' },
  { label: 'Отчёты', to: '/reports' },
  { label: 'Документы', to: '/documents' },
  { label: '3D Viewer', to: '/viewer' },
];

const MainLayout = () => {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>NewHorizonBuild CRM</h1>
        <nav className="nav-links">
          {navItems.map((item) => (
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
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
