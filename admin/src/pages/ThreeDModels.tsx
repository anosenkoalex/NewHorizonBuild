// admin/src/pages/ThreeDModels.tsx
import React, { useEffect, useState } from 'react';
import {
  Project,
  fetchProjects,
  updateProject3D,
  UpdateProject3DPayload,
} from '../api/projects';
import {
  Unit,
  fetchUnits,
  updateUnitModelElementKey,
  updateUnitPlanImageUrl,
} from '../api/units';

const ThreeDModelsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  const [project3DForm, setProject3DForm] =
    useState<UpdateProject3DPayload>({
      threeDModelUrl: '',
      threeDModelFormat: '',
      threeDPreviewImage: '',
    });
  const [savingProject3D, setSavingProject3D] = useState(false);

  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const [savingUnitId, setSavingUnitId] = useState<string | null>(null);

  // --- загрузка проектов ---
  useEffect(() => {
    const load = async () => {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const data = await fetchProjects();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
          setProject3DForm({
            threeDModelUrl: data[0].threeDModelUrl ?? '',
            threeDModelFormat: data[0].threeDModelFormat ?? '',
            threeDPreviewImage: data[0].threeDPreviewImage ?? '',
          });
        }
      } catch (e: any) {
        setProjectsError(e?.message || 'Не удалось загрузить проекты');
      } finally {
        setProjectsLoading(false);
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // когда выбираем другой проект — подтягиваем его 3D-поля и юниты
  useEffect(() => {
    const project = projects.find((p) => p.id === selectedProjectId);
    if (project) {
      setProject3DForm({
        threeDModelUrl: project.threeDModelUrl ?? '',
        threeDModelFormat: project.threeDModelFormat ?? '',
        threeDPreviewImage: project.threeDPreviewImage ?? '',
      });
    }

    if (!selectedProjectId) {
      setUnits([]);
      return;
    }

    const loadUnits = async () => {
      setUnitsLoading(true);
      setUnitsError(null);
      try {
        const data = await fetchUnits({ projectId: selectedProjectId });
        setUnits(data);
      } catch (e: any) {
        setUnitsError(e?.message || 'Не удалось загрузить юниты проекта');
      } finally {
        setUnitsLoading(false);
      }
    };

    void loadUnits();
  }, [selectedProjectId, projects]);

  const handleChangeProjectField = (
    field: keyof UpdateProject3DPayload,
    value: string,
  ) => {
    setProject3DForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProject3D = async () => {
    if (!selectedProjectId) return;
    setSavingProject3D(true);
    try {
      const updated = await updateProject3D(
        selectedProjectId,
        project3DForm,
      );
      // Обновляем список проектов, чтобы Viewer и другие места видели актуальные данные
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
    } catch (e: any) {
      alert(e?.message || 'Ошибка при сохранении 3D-настроек проекта');
    } finally {
      setSavingProject3D(false);
    }
  };

  const handleChangeUnitModelKey = (unitId: string, value: string) => {
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId ? { ...u, modelElementKey: value } : u,
      ),
    );
  };

  const handleChangeUnitPlanImage = (unitId: string, value: string) => {
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId ? { ...u, planImageUrl: value } : u,
      ),
    );
  };

  const handleSaveUnit = async (unit: Unit) => {
    setSavingUnitId(unit.id);
    try {
      // сначала ключ 3D-элемента
      const updated1 = await updateUnitModelElementKey(
        unit.id,
        unit.modelElementKey,
      );
      // потом ссылка на планировку
      const updated2 = await updateUnitPlanImageUrl(
        unit.id,
        unit.planImageUrl ?? null,
      );

      const updated = updated2 ?? updated1;

      setUnits((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      );
    } catch (e: any) {
      alert(
        e?.message ||
          'Ошибка при сохранении связки 3D-модели / планировки',
      );
    } finally {
      setSavingUnitId(null);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>3D-модели</h1>
      <p style={{ marginBottom: 12, maxWidth: 720 }}>
        Здесь можно привязать 3D-модель (GLB/GLTF и т.п.) к проекту и
        настроить соответствие между квартирами/помещениями и элементами
        сцены <code>modelElementKey</code>. Эти данные затем используются в
        3D Viewer.
      </p>
      <p style={{ marginBottom: 24, maxWidth: 720, fontSize: 13 }}>
        Также тут задаётся ссылка на 2D-планировку юнита (
        <code>planImageUrl</code>) — она показывается в Viewer справа, при
        выборе квартиры.
      </p>

      {projectsLoading && <div>Загрузка проектов...</div>}
      {projectsError && (
        <div style={{ color: 'red', marginBottom: 16 }}>
          {projectsError}
        </div>
      )}

      {!projectsLoading && projects.length === 0 && (
        <div>Проекты ещё не созданы.</div>
      )}

      {projects.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 24,
          }}
        >
          {/* Левая колонка — настройки проекта */}
          <div
            style={{
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.4)',
              padding: 16,
              background: '#020617',
            }}
          >
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Проект</h2>

            <label
              style={{
                display: 'block',
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              Выберите проект:
            </label>
            <select
              value={selectedProjectId ?? ''}
              onChange={(e) =>
                setSelectedProjectId(e.target.value || null)
              }
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.6)',
                background: '#020617',
                color: '#e5e7eb',
                marginBottom: 16,
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div
              style={{
                fontSize: 13,
                marginBottom: 16,
                opacity: 0.9,
              }}
            >
              Укажи здесь ссылку на GLB/GLTF файл (например,
              <code> https://…/house.glb </code>), формат и при желании
              картинку превью. 3D Viewer будет подхватывать эти данные.
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                URL 3D-модели
              </label>
              <input
                type="text"
                value={project3DForm.threeDModelUrl ?? ''}
                onChange={(e) =>
                  handleChangeProjectField(
                    'threeDModelUrl',
                    e.target.value,
                  )
                }
                placeholder="https://example.com/models/house.glb"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid rgba(148,163,184,0.6)',
                  background: '#020617',
                  color: '#e5e7eb',
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                Формат модели
              </label>
              <input
                type="text"
                value={project3DForm.threeDModelFormat ?? ''}
                onChange={(e) =>
                  handleChangeProjectField(
                    'threeDModelFormat',
                    e.target.value,
                  )
                }
                placeholder="glb / gltf / obj / fbx ..."
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid rgba(148,163,184,0.6)',
                  background: '#020617',
                  color: '#e5e7eb',
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                URL превью-картинки
              </label>
              <input
                type="text"
                value={project3DForm.threeDPreviewImage ?? ''}
                onChange={(e) =>
                  handleChangeProjectField(
                    'threeDPreviewImage',
                    e.target.value,
                  )
                }
                placeholder="https://example.com/previews/house.png"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid rgba(148,163,184,0.6)',
                  background: '#020617',
                  color: '#e5e7eb',
                  fontSize: 13,
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleSaveProject3D}
              disabled={savingProject3D || !selectedProjectId}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                border: 'none',
                background: savingProject3D ? '#4b5563' : '#3b82f6',
                color: '#f9fafb',
                fontSize: 13,
                fontWeight: 600,
                cursor: savingProject3D ? 'default' : 'pointer',
              }}
            >
              {savingProject3D ? 'Сохранение…' : 'Сохранить 3D-настройки'}
            </button>
          </div>

          {/* Правая колонка — список юнитов и modelElementKey / planImageUrl */}
          <div
            style={{
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.4)',
              padding: 16,
              background: '#020617',
            }}
          >
            <h2
              style={{
                fontSize: 18,
                marginBottom: 12,
              }}
            >
              Связка юнитов, 3D-элементов и планировок
            </h2>

            {unitsLoading && <div>Загрузка юнитов...</div>}
            {unitsError && (
              <div style={{ color: 'red', marginBottom: 12 }}>
                {unitsError}
              </div>
            )}

            {!unitsLoading && units.length === 0 && (
              <div style={{ fontSize: 13 }}>
                В этом проекте пока нет юнитов.
              </div>
            )}

            {!unitsLoading && units.length > 0 && (
              <div
                style={{
                  maxHeight: 520,
                  overflow: 'auto',
                  borderRadius: 8,
                  border: '1px solid rgba(30,64,175,0.6)',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        position: 'sticky',
                        top: 0,
                        background: '#020617',
                      }}
                    >
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderBottom:
                            '1px solid rgba(148,163,184,0.4)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Юнит
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderBottom:
                            '1px solid rgba(148,163,184,0.4)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Тип / статус
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderBottom:
                            '1px solid rgba(148,163,184,0.4)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Площадь / комнаты
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderBottom:
                            '1px solid rgba(148,163,184,0.4)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        modelElementKey
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderBottom:
                            '1px solid rgba(148,163,184,0.4)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Планировка (URL)
                      </th>
                      <th
                        style={{
                          padding: '8px 10px',
                          borderBottom:
                            '1px solid rgba(148,163,184,0.4)',
                        }}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((u) => (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom:
                            '1px solid rgba(30,64,175,0.3)',
                        }}
                      >
                        <td
                          style={{
                            padding: '6px 10px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {u.number || '—'}
                        </td>
                        <td
                          style={{
                            padding: '6px 10px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {u.type} / {u.status}
                        </td>
                        <td
                          style={{
                            padding: '6px 10px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {u.area ? `${u.area} м²` : '—'}
                          {u.rooms != null ? ` • ${u.rooms} комн.` : ''}
                        </td>
                        <td
                          style={{
                            padding: '6px 10px',
                            width: '28%',
                          }}
                        >
                          <input
                            type="text"
                            value={u.modelElementKey ?? ''}
                            onChange={(e) =>
                              handleChangeUnitModelKey(
                                u.id,
                                e.target.value,
                              )
                            }
                            placeholder="Например, apartment_12A"
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              borderRadius: 6,
                              border: '1px solid rgba(148,163,184,0.6)',
                              background: '#020617',
                              color: '#e5e7eb',
                              fontSize: 12,
                            }}
                          />
                        </td>
                        <td
                          style={{
                            padding: '6px 10px',
                            width: '32%',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              gap: 6,
                              alignItems: 'center',
                            }}
                          >
                            <input
                              type="text"
                              value={u.planImageUrl ?? ''}
                              onChange={(e) =>
                                handleChangeUnitPlanImage(
                                  u.id,
                                  e.target.value,
                                )
                              }
                              placeholder="https://.../plans/flat-12A.png"
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                borderRadius: 6,
                                border: '1px solid rgba(148,163,184,0.6)',
                                background: '#020617',
                                color: '#e5e7eb',
                                fontSize: 12,
                              }}
                            />
                            {u.planImageUrl && (
                              <a
                                href={u.planImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: 11,
                                  color: '#60a5fa',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Открыть
                              </a>
                            )}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '6px 10px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleSaveUnit(u)}
                            disabled={savingUnitId === u.id}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              border: 'none',
                              background:
                                savingUnitId === u.id
                                  ? '#4b5563'
                                  : '#3b82f6',
                              color: '#f9fafb',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor:
                                savingUnitId === u.id
                                  ? 'default'
                                  : 'pointer',
                            }}
                          >
                            {savingUnitId === u.id
                              ? 'Сохр...'
                              : 'Сохранить'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDModelsPage;
