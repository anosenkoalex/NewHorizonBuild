// admin/src/App.tsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Units from './pages/Units';
import Deals from './pages/Deals';
import Reports from './pages/Reports';
import Documents from './pages/Documents';
import Viewer from './pages/Viewer';
import Clients from './pages/Clients';
import UsersPage from './pages/Users';
import Projects3DPage from './pages/Projects3D';
import ThreeDModelsPage from './pages/ThreeDModels';
import Login from './pages/Login';
import { useAuth } from './auth/AuthContext';
import DealDetails from './pages/DealDetails';
import ClientDetails from './pages/ClientDetails';

// Публичные страницы для TV / Demo
import DemoMenu from './pages/DemoMenu';
import DemoScreen from './pages/DemoScreen';

// Служебная hidden 3D страница demo-экранов
import DemoDisplaysPage from './pages/DemoDisplays';

type UserRole = 'ADMIN' | 'MANAGER' | 'SALES_HEAD' | 'LEGAL' | 'VIEWER';

type ThreeDWorkspaceMeResponse = {
  hasAccess: boolean;
  email: string | null;
  access: {
    id: string;
    email: string;
    fullName: string | null;
    isActive: boolean;
    canAccessWorkspace: boolean;
    canUploadModels: boolean;
    canManageScenes: boolean;
    canConfigureWalkthroughs: boolean;
    canManageBindings: boolean;
    canPublish: boolean;
    canManageAccess: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  permissions: {
    hasAccess: boolean;
    canUploadModels: boolean;
    canManageScenes: boolean;
    canConfigureWalkthroughs: boolean;
    canManageBindings: boolean;
    canPublish: boolean;
    canManageAccess: boolean;
  };
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const STORAGE_TOKEN_KEY = 'nhb_token';

function getDefaultRouteForRole(role?: string): string {
  const normalized = String(role ?? '').toUpperCase();

  switch (normalized) {
    case 'ADMIN':
    case 'SALES_HEAD':
    case 'MANAGER':
      return '/';
    case 'LEGAL':
      return '/documents';
    case 'VIEWER':
      return '/viewer';
    default:
      return '/login';
  }
}

function LoadingScreen() {
  return <div style={{ padding: 24 }}>Загрузка...</div>;
}

function PrivateRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function RoleRoute({ roles }: { roles: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <Outlet />;
}

function Hidden3DRoute() {
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) {
        if (!cancelled) {
          setHasAccess(false);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);

        const token = localStorage.getItem(STORAGE_TOKEN_KEY);

        const res = await fetch(`${API_URL}/three-d-workspace-access/me`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          throw new Error('Не удалось проверить 3D access');
        }

        const data = (await res.json()) as ThreeDWorkspaceMeResponse;

        if (!cancelled) {
          setHasAccess(!!data?.permissions?.hasAccess);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setHasAccess(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Публичные маршруты для телевизоров */}
      <Route path="/demo" element={<DemoMenu />} />
      <Route path="/demo/:code" element={<DemoScreen />} />

      {/* CRM */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<MainLayout />}>
          {/* Сводка */}
          <Route element={<RoleRoute roles={['ADMIN', 'SALES_HEAD', 'MANAGER']} />}>
            <Route index element={<Dashboard />} />
          </Route>

          {/* Основной CRM блок */}
          <Route element={<RoleRoute roles={['ADMIN', 'SALES_HEAD', 'MANAGER']} />}>
            <Route path="units" element={<Units />} />
            <Route path="deals" element={<Deals />} />
            <Route path="deals/:id" element={<DealDetails />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetails />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Юридический блок */}
          <Route
            element={
              <RoleRoute
                roles={['ADMIN', 'SALES_HEAD', 'MANAGER', 'LEGAL']}
              />
            }
          >
            <Route path="documents" element={<Documents />} />
          </Route>

          {/* Пользователи */}
          <Route element={<RoleRoute roles={['ADMIN']} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>

          {/* 3D показы / рабочий viewer */}
          <Route
            element={
              <RoleRoute
                roles={['ADMIN', 'SALES_HEAD', 'MANAGER', 'VIEWER']}
              />
            }
          >
            <Route path="viewer" element={<Viewer />} />
          </Route>

          {/* Hidden 3D workspace routes */}
          <Route element={<Hidden3DRoute />}>
            <Route path="3d-models" element={<ThreeDModelsPage />} />
            <Route path="projects-3d" element={<Projects3DPage />} />
            <Route path="demo-displays" element={<DemoDisplaysPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;