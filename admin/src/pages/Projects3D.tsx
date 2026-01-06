// admin/src/pages/Projects3D.tsx
import React, { useEffect, useState } from 'react';
import {
  fetchProjects,
  updateProject3D,
  Project,
  UpdateProject3DPayload,
} from '../api/projects';

const Projects3DPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Ошибка при загрузке списка проектов',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const handleFieldChange = (
    id: string,
    field: keyof UpdateProject3DPayload,
    value: string,
  ) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]: value || null,
            }
          : p,
      ),
    );
  };

  const handleSave = async (project: Project) => {
    try {
      setSavingId(project.id);

      const payload: UpdateProject3DPayload = {
        threeDModelUrl: project.threeDModelUrl ?? null,
        threeDModelFormat: project.threeDModelFormat ?? null,
        threeDPreviewImage: project.threeDPreviewImage ?? null,
      };

      const updated = await updateProject3D(project.id, payload);

      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? updated : p)),
      );
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : 'Ошибка при сохранении 3D-настроек проекта',
      );
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div>Загрузка проектов...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  if (!projects.length) {
    return <div>Проектов пока нет.</div>;
  }

  return (
    <div style={{ paddingRight: 24 }}>
      <h1>3D-модели проектов</h1>

      <p style={{ fontSize: 14, marginBottom: 16 }}>
        Здесь задаются ссылки на 3D-модели (GLB/GLTF и т.п.) для каждого
        проекта. Эти поля используются на странице <b>3D Viewer</b>.
        <br />
        Файлы можно положить в <code>admin/public/models</code> и указывать
        путь вида <code>/models/demo-building.glb</code>.
      </p>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Проект</th>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Адрес</th>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>
              URL 3D-модели
            </th>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>
              Формат (glb/gltf/…)
            </th>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>
              Превью (картинка)
            </th>
            <th style={{ padding: '6px 8px' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #e5e7eb',
                  minWidth: 160,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 2,
                  }}
                >
                  {p.name}
                </div>
                {p.description && (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {p.description}
                  </div>
                )}
              </td>
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #e5e7eb',
                  minWidth: 140,
                }}
              >
                {p.address ?? '—'}
              </td>
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <input
                  type="text"
                  placeholder="/models/demo-building.glb"
                  value={p.threeDModelUrl ?? ''}
                  onChange={(e) =>
                    handleFieldChange(p.id, 'threeDModelUrl', e.target.value)
                  }
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </td>
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #e5e7eb',
                  width: 120,
                }}
              >
                <input
                  type="text"
                  placeholder="glb"
                  value={p.threeDModelFormat ?? ''}
                  onChange={(e) =>
                    handleFieldChange(
                      p.id,
                      'threeDModelFormat',
                      e.target.value,
                    )
                  }
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </td>
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <input
                  type="text"
                  placeholder="/images/building-preview.png"
                  value={p.threeDPreviewImage ?? ''}
                  onChange={(e) =>
                    handleFieldChange(
                      p.id,
                      'threeDPreviewImage',
                      e.target.value,
                    )
                  }
                  style={{ width: '100%', padding: '4px 6px' }}
                />
              </td>
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #e5e7eb',
                  textAlign: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSave(p)}
                  disabled={savingId === p.id}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#2563eb',
                    color: '#f9fafb',
                    fontSize: 13,
                    cursor: savingId === p.id ? 'default' : 'pointer',
                  }}
                >
                  {savingId === p.id ? 'Сохранение…' : 'Сохранить'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Projects3DPage;
