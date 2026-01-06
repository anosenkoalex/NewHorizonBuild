// admin/src/pages/Viewer.tsx
import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import styles from './Viewer.module.css';
import { fetchProjects, Project } from '../api/projects';
import {
  fetchUnits,
  Unit,
  updateUnitModelElementKey,
  updateUnitPlanImageUrl,
} from '../api/units';

// ------------------------------------------------------
// Метаданные для статусов: цвет + человекочитаемое название
// ------------------------------------------------------
const STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
  }
> = {
  FREE: { label: 'Свободен', color: '#22c55e' }, // зелёный
  RESERVED: { label: 'Резерв', color: '#eab308' }, // жёлтый
  SOLD: { label: 'Продан', color: '#ef4444' }, // красный
  INSTALLMENT: { label: 'Рассрочка', color: '#3b82f6' }, // синий
  EQUITY: { label: 'Долевое', color: '#a855f7' }, // фиолетовый
};

// Компонент загрузчика для 3D
const Loader: React.FC = () => (
  <Html center>
    <div
      style={{
        padding: '8px 12px',
        borderRadius: 999,
        background: 'rgba(15,23,42,0.85)',
        color: '#e5e7eb',
        fontSize: 13,
      }}
    >
      Загрузка 3D-модели...
    </div>
  </Html>
);

interface BuildingModelProps {
  url: string;
  units: Unit[];
  selectedUnitId: string | null;
  onSelectUnitByElementKey?: (elementKey: string) => void;
}

/**
 * Отрисовка 3D-модели с раскраской элементов по статусу юнита.
 * Совпадение идёт по имени меша (mesh.name === unit.modelElementKey).
 * Плюс отдельная подсветка выбранного юнита.
 */
const BuildingModel: React.FC<BuildingModelProps> = ({
  url,
  units,
  selectedUnitId,
  onSelectUnitByElementKey,
}) => {
  // drei сам кэширует модель
  const gltf = useGLTF(url, true);
  const scene = gltf.scene;

  useEffect(() => {
    if (!scene) return;

    // быстрый доступ: статус → цвет
    const statusColors: Record<string, string> = Object.entries(
      STATUS_META,
    ).reduce((acc, [status, meta]) => {
      acc[status] = meta.color;
      return acc;
    }, {} as Record<string, string>);

    const defaultColor = '#64748b'; // базовый серо-синий для юнитов без маппинга

    scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;

      if (!mesh.isMesh) return;

      const elementKey = mesh.name;
      if (!elementKey) {
        // если у объекта нет имени — оставляем материал как есть
        return;
      }

      const unit = units.find(
        (u) => u.modelElementKey && u.modelElementKey === elementKey,
      );

      const baseColor =
        (unit && statusColors[unit.status]) ?? defaultColor;

      // если это выбранный юнит — делаем его чуть ярче/светлее
      const isSelected =
        unit && selectedUnitId && unit.id === selectedUnitId;

      const colorHex = isSelected ? '#ffffff' : baseColor;

      const material = mesh.material as any;

      if (Array.isArray(material)) {
        material.forEach((m) => {
          if (m && m.color && typeof m.color.set === 'function') {
            m.color.set(colorHex);
          }
        });
      } else if (
        material &&
        material.color &&
        typeof material.color.set === 'function'
      ) {
        material.color.set(colorHex);
      }
    });
  }, [scene, units, selectedUnitId]);

  return (
    <primitive
      object={scene}
      // Клик по 3D-модели → определяем имя меша и пробуем подобрать юнит
      onClick={(e: any) => {
        e.stopPropagation();
        if (!onSelectUnitByElementKey) return;
        const obj = e.object as THREE.Object3D;
        const key = obj.name;
        if (!key) return;
        onSelectUnitByElementKey(key);
      }}
    />
  );
};

const Viewer: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedProjectId, setSelectedProjectId] =
    useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // фильтры по дому / секции / этажу
  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [floorFilter, setFloorFilter] = useState<string>('');

  // фильтры по “дырам” в данных
  const [onlyWithoutModelKey, setOnlyWithoutModelKey] =
    useState<boolean>(false);
  const [onlyWithoutPlan, setOnlyWithoutPlan] =
    useState<boolean>(false);

  // локальное состояние для modelElementKey
  const [modelKeyInput, setModelKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // локальное состояние для ссылки на планировку
  const [planUrlInput, setPlanUrlInput] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaveError, setPlanSaveError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [projectsData, unitsData] = await Promise.all([
          fetchProjects(),
          fetchUnits({}),
        ]);

        setProjects(projectsData);
        setUnits(unitsData);

        if (projectsData.length > 0) {
          setSelectedProjectId(projectsData[0].id);
        }
      } catch (e: any) {
        console.error(e);
        setError(
          e?.message ?? 'Не удалось загрузить проекты или объекты',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const currentProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  // юниты по проекту
  const projectUnits = useMemo(() => {
    if (!selectedProjectId) return units;

    const forProject = units.filter(
      (u) => u.projectId === selectedProjectId,
    );

    // если у проекта нет юнитов – показываем все (демо-режим)
    return forProject.length > 0 ? forProject : units;
  }, [units, selectedProjectId]);

  // варианты для фильтров (вычисляем из projectUnits)
  const buildingOptions = useMemo(
    () =>
      Array.from(new Set(projectUnits.map((u) => u.buildingId))).sort(),
    [projectUnits],
  );

  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          projectUnits
            .map((u) => u.sectionId)
            .filter((v): v is string => !!v),
        ),
      ).sort(),
    [projectUnits],
  );

  const floorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          projectUnits
            .map((u) => u.floorId)
            .filter((v): v is string => !!v),
        ),
      ).sort(),
    [projectUnits],
  );

  // применяем фильтры к юнитам проекта
  const visibleUnits = useMemo(
    () =>
      projectUnits.filter((u) => {
        if (buildingFilter && u.buildingId !== buildingFilter) {
          return false;
        }
        if (sectionFilter && u.sectionId !== sectionFilter) {
          return false;
        }
        if (floorFilter && u.floorId !== floorFilter) {
          return false;
        }
        if (onlyWithoutModelKey && u.modelElementKey) {
          return false;
        }
        if (onlyWithoutPlan && u.planImageUrl) {
          return false;
        }
        return true;
      }),
    [
      projectUnits,
      buildingFilter,
      sectionFilter,
      floorFilter,
      onlyWithoutModelKey,
      onlyWithoutPlan,
    ],
  );

  // юнит, выбранный в сайдбаре/3D
  const selectedUnit = useMemo(
    () =>
      (visibleUnits.length > 0
        ? visibleUnits
        : projectUnits
      ).find((u) => u.id === selectedUnitId) ?? null,
    [visibleUnits, projectUnits, selectedUnitId],
  );

  // когда выбираем другой юнит — подставляем его данные в инпуты
  useEffect(() => {
    if (selectedUnit) {
      setModelKeyInput(selectedUnit.modelElementKey ?? '');
      setPlanUrlInput(selectedUnit.planImageUrl ?? '');
      setSaveError(null);
      setPlanSaveError(null);
    } else {
      setModelKeyInput('');
      setPlanUrlInput('');
      setSaveError(null);
      setPlanSaveError(null);
    }
  }, [selectedUnit]);

  const handleSaveModelKey = async () => {
    if (!selectedUnit) return;

    try {
      setSavingKey(true);
      setSaveError(null);

      const updated = await updateUnitModelElementKey(
        selectedUnit.id,
        modelKeyInput.trim() === '' ? null : modelKeyInput.trim(),
      );

      // обновляем локальный список юнитов
      setUnits((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      );
    } catch (e: any) {
      console.error(e);
      setSaveError(e?.message ?? 'Ошибка при сохранении связки');
    } finally {
      setSavingKey(false);
    }
  };

  const handleSavePlanUrl = async () => {
    if (!selectedUnit) return;

    try {
      setSavingPlan(true);
      setPlanSaveError(null);

      const url = planUrlInput.trim() === '' ? null : planUrlInput.trim();

      const updated = await updateUnitPlanImageUrl(
        selectedUnit.id,
        url,
      );

      setUnits((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      );
    } catch (e: any) {
      console.error(e);
      setPlanSaveError(
        e?.message ?? 'Ошибка при сохранении планировки',
      );
    } finally {
      setSavingPlan(false);
    }
  };

  // Клик по 3D-модели → подобрать юнит по modelElementKey
  const handleSelectUnitByElementKey = (elementKey: string) => {
    if (!elementKey) return;

    // Сначала ищем среди всех юнитов
    let unit =
      units.find((u) => u.modelElementKey === elementKey) ?? null;

    if (!unit) {
      // Просто тихо игнорируем — в интерфейсе это не ошибка
      return;
    }

    // Переключаем проект, если нужно
    if (unit.projectId !== selectedProjectId) {
      setSelectedProjectId(unit.projectId);
      // сбросим фильтры, чтобы юнит точно попал в список
      setBuildingFilter('');
      setSectionFilter('');
      setFloorFilter('');
      setOnlyWithoutModelKey(false);
      setOnlyWithoutPlan(false);
    }

    setSelectedUnitId(unit.id);
  };

  // какие юниты используем для окраски модели:
  // если фильтры заданы — подсвечиваем только отфильтрованные, остальные серые
  const unitsFor3D =
    visibleUnits.length > 0 ? visibleUnits : projectUnits;

  if (loading) {
    return (
      <div className={styles.viewerRoot}>
        <div className={styles.viewerLoading}>Загрузка данных...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.viewerRoot}>
        <div className={styles.viewerError}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.viewerRoot}>
      <div className={styles.viewerLayout}>
        {/* Сайдбар с проектами и списком юнитов */}
        <div className={styles.viewerSidebar}>
          <div className={styles.fieldGroup}>
            <label htmlFor="project-select">Проект:</label>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedUnitId(null);
                setBuildingFilter('');
                setSectionFilter('');
                setFloorFilter('');
                setOnlyWithoutModelKey(false);
                setOnlyWithoutPlan(false);
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Фильтр по дому/секции/этажу */}
          <div className={styles.filterRow}>
            <div className={styles.filterCol}>
              <label htmlFor="building-select">Дом / корпус:</label>
              <select
                id="building-select"
                value={buildingFilter}
                onChange={(e) => {
                  setBuildingFilter(e.target.value);
                  setSelectedUnitId(null);
                }}
              >
                <option value="">Все</option>
                {buildingOptions.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterCol}>
              <label htmlFor="section-select">Секция:</label>
              <select
                id="section-select"
                value={sectionFilter}
                onChange={(e) => {
                  setSectionFilter(e.target.value);
                  setSelectedUnitId(null);
                }}
              >
                <option value="">Все</option>
                {sectionOptions.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterCol}>
              <label htmlFor="floor-select">Этаж:</label>
              <select
                id="floor-select"
                value={floorFilter}
                onChange={(e) => {
                  setFloorFilter(e.target.value);
                  setSelectedUnitId(null);
                }}
              >
                <option value="">Все</option>
                {floorOptions.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Фильтры по “дырам”: без 3D-связки / без плана */}
          <div className={styles.fieldGroup}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={onlyWithoutModelKey}
                onChange={(e) => {
                  setOnlyWithoutModelKey(e.target.checked);
                  setSelectedUnitId(null);
                }}
              />
              <span>Только без 3D-связки</span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                marginTop: 4,
              }}
            >
              <input
                type="checkbox"
                checked={onlyWithoutPlan}
                onChange={(e) => {
                  setOnlyWithoutPlan(e.target.checked);
                  setSelectedUnitId(null);
                }}
              />
              <span>Только без планировки</span>
            </label>
          </div>

          <div className={styles.unitsHeader}>
            <h3>Объекты в проекте</h3>
            <span className={styles.unitsCount}>
              {(visibleUnits.length > 0
                ? visibleUnits
                : projectUnits
              ).length}{' '}
              шт.
            </span>
          </div>

          {(visibleUnits.length > 0 ? visibleUnits : projectUnits)
            .length === 0 ? (
            <p className={styles.helperText}>
              Для этого проекта пока нет объектов (юнитов).
            </p>
          ) : (
            <ul className={styles.unitsList}>
              {(visibleUnits.length > 0 ? visibleUnits : projectUnits).map(
                (u) => {
                  const meta = STATUS_META[u.status] ?? {
                    label: u.status,
                    color: '#6b7280',
                  };

                  return (
                    <li
                      key={u.id}
                      className={
                        u.id === selectedUnitId
                          ? `${styles.unitItem} ${styles.unitItemActive}`
                          : styles.unitItem
                      }
                      onClick={() => setSelectedUnitId(u.id)}
                    >
                      <div className={styles.unitTitle}>
                        <strong>{u.number ?? 'Без номера'}</strong>
                        <span className={styles.unitType}>
                          ({u.type})
                        </span>
                      </div>
                      <div className={styles.unitMeta}>
                        <span
                          className={styles.unitStatusBadge}
                          style={{
                            backgroundColor: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                        {u.area && <span> · {u.area} м²</span>}
                        {u.price != null && (
                          <span>
                            {' '}
                            · {u.price.toLocaleString()} сом
                          </span>
                        )}
                      </div>
                    </li>
                  );
                },
              )}
            </ul>
          )}
        </div>

        {/* Правая часть — Canvas + детали юнита */}
        <div className={styles.viewerCanvas}>
          <h2>3D-модель объекта</h2>

          {/* Легенда статусов прямо рядом с 3D */}
          <div className={styles.statusLegend}>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} className={styles.statusLegendItem}>
                <span
                  className={styles.statusDot}
                  style={{ backgroundColor: meta.color }}
                />
                <span className={styles.statusLegendLabel}>
                  {meta.label}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.canvasWrapper}>
            <Canvas
              camera={{ position: [0, 5, 10], fov: 45 }}
              style={{ width: '100%', height: '100%' }}
            >
              <color attach="background" args={['#020617']} />
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 10, 5]} intensity={0.8} />

              <Suspense fallback={<Loader />}>
                {currentProject?.threeDModelUrl ? (
                  <BuildingModel
                    url={currentProject.threeDModelUrl}
                    units={unitsFor3D}
                    selectedUnitId={selectedUnitId}
                    onSelectUnitByElementKey={handleSelectUnitByElementKey}
                  />
                ) : (
                  // если 3D-модель не задана — просто куб-заглушка
                  <mesh>
                    <boxGeometry args={[2, 2, 2]} />
                    <meshStandardMaterial />
                  </mesh>
                )}
              </Suspense>

              <OrbitControls makeDefault />
            </Canvas>
          </div>

          {!selectedUnit && (
            <p className={styles.helperText}>
              Выберите объект слева или кликните по 3D-модели (если меши
              подписаны), чтобы посмотреть информацию о нём. Когда у проекта
              будет настроен <code>threeDModelUrl</code> и{' '}
              <code>modelElementKey</code> у юнитов, здесь будет отображаться
              интерактивная 3D-модель с подсветкой статуса объектов.
            </p>
          )}

          {selectedUnit && (
            <div className={styles.unitDetails}>
              <h3>Карточка объекта</h3>
              <div className={styles.unitDetailsGrid}>
                <div className={styles.unitDetailsBlock}>
                  <p>
                    <strong>Номер:</strong>{' '}
                    {selectedUnit.number ?? 'Без номера'}
                  </p>
                  <p>
                    <strong>Тип:</strong> {selectedUnit.type}
                  </p>
                  {selectedUnit.area && (
                    <p>
                      <strong>Площадь:</strong> {selectedUnit.area} м²
                    </p>
                  )}
                  {selectedUnit.rooms != null && (
                    <p>
                      <strong>Комнат:</strong> {selectedUnit.rooms}
                    </p>
                  )}
                  <p>
                    <strong>Статус:</strong>{' '}
                    {
                      (STATUS_META[selectedUnit.status] ?? {
                        label: selectedUnit.status,
                      }).label
                    }
                  </p>
                  {selectedUnit.price != null && (
                    <p>
                      Цена: {selectedUnit.price.toLocaleString()} сом
                    </p>
                  )}
                </div>

                {/* Планировка (2D-план), если есть ссылка */}
                {selectedUnit.planImageUrl && (
                  <div className={styles.planPreview}>
                    <p className={styles.planTitle}>Планировка</p>
                    <div className={styles.planImageWrapper}>
                      <img
                        src={selectedUnit.planImageUrl}
                        alt={`Планировка юнита ${
                          selectedUnit.number ?? selectedUnit.id
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Редактирование planImageUrl и modelElementKey */}
              <div className={styles.editRow}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="plan-url-input">
                    Ссылка на планировку (planImageUrl):
                  </label>
                  <input
                    id="plan-url-input"
                    type="text"
                    value={planUrlInput}
                    onChange={(e) => setPlanUrlInput(e.target.value)}
                    placeholder="https://example.com/plan.png"
                  />
                  <button
                    type="button"
                    onClick={handleSavePlanUrl}
                    disabled={savingPlan}
                  >
                    {savingPlan ? 'Сохранение…' : 'Сохранить планировку'}
                  </button>
                  {planSaveError && (
                    <div className={styles.errorText}>{planSaveError}</div>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="model-key-input">
                    Ключ элемента в 3D-сцене (modelElementKey):
                  </label>
                  <input
                    id="model-key-input"
                    type="text"
                    value={modelKeyInput}
                    onChange={(e) => setModelKeyInput(e.target.value)}
                    placeholder="Например: Flat_1203"
                  />
                  <button
                    type="button"
                    onClick={handleSaveModelKey}
                    disabled={savingKey}
                  >
                    {savingKey ? 'Сохранение…' : 'Сохранить связку'}
                  </button>
                  {saveError && (
                    <div className={styles.errorText}>{saveError}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Viewer;
