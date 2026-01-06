// admin/src/App.tsx
import { Route, Routes, Navigate, Outlet } from 'react-router-dom';
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
import ThreeDModelsPage from './pages/ThreeDModels'; // 👈 НОВЫЙ импорт
import Login from './pages/Login';
import { useAuth } from './auth/AuthContext';

function PrivateRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: 24 }}>Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <Routes>
      {/* Публичный маршрут логина */}
      <Route path="/login" element={<Login />} />

      {/* Все остальные — под защитой */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="units" element={<Units />} />
          <Route path="deals" element={<Deals />} />
          <Route path="clients" element={<Clients />} />
          <Route path="reports" element={<Reports />} />
          <Route path="documents" element={<Documents />} />
          <Route path="users" element={<UsersPage />} />

          {/* Админская страница управления 3D-моделями */}
          <Route path="3d-models" element={<ThreeDModelsPage />} />

          {/* Старый тестовый экран проектов в 3D — если не нужен, можно потом удалить */}
          <Route path="projects-3d" element={<Projects3DPage />} />

          {/* Просмотрщик 3D-сцены */}
          <Route path="viewer" element={<Viewer />} />
        </Route>
      </Route>

      {/* Любой левый путь → на / */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
