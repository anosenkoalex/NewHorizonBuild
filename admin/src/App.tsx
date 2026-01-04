import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Units from './pages/Units';
import Deals from './pages/Deals';
import Reports from './pages/Reports';
import Documents from './pages/Documents';
import Viewer from './pages/Viewer';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="units" element={<Units />} />
        <Route path="deals" element={<Deals />} />
        <Route path="reports" element={<Reports />} />
        <Route path="documents" element={<Documents />} />
        <Route path="viewer" element={<Viewer />} />
      </Route>
    </Routes>
  );
}

export default App;
