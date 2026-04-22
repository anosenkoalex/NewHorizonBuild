// admin/src/pages/Viewer.tsx
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import styles from './Viewer.module.css';
import { fetchProjects, type Project } from '../api/projects';
import { fetchUnits, type Unit } from '../api/units';
import {
  fetchMyDemoDisplay,
  syncMyViewerState,
  touchMyViewer,
  type DemoDisplay,
} from '../api/demoDisplays';

const STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
  }
> = {
  FREE: { label: 'Свободен', color: '#22c55e' },
  RESERVED: { label: 'Резерв', color: '#eab308' },
  SOLD: { label: 'Продан', color: '#ef4444' },
  INSTALLMENT: { label: 'Рассрочка', color: '#3b82f6' },
  EQUITY: { label: 'Долевое', color: '#a855f7' },
};

type ViewerMode = 'overview' | 'unit';
type UnitStatusFilter = 'ALL' | 'FREE' | 'RESERVED' | 'SOLD' | 'INSTALLMENT' | 'EQUITY';
type UnitTypeFilter = 'ALL' | 'APARTMENT' | 'COMMERCIAL' | 'PARKING';

const API_URL = (() => {
  const raw = String(
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  ).trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

function resolveAssetUrl(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;

  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('data:')
  ) {
    return normalized;
  }

  if (normalized.startsWith('/')) {
    return `${API_URL}${normalized}`;
  }

  return `${API_URL}/${normalized}`;
}

const Loader: React.FC = () => (
  <Html center>
    <div className={styles.loaderPill}>Загрузка 3D-модели...</div>
  </Html>
);

interface BuildingModelProps {
  url: string;
  units: Unit[];
  selectedUnitId: string | null;
  onSelectUnitByElementKey?: (elementKey: string) => void;
}

const BuildingModel: React.FC<BuildingModelProps> = ({
  url,
  units,
  selectedUnitId,
  onSelectUnitByElementKey,
}) => {
  const gltf = useGLTF(url, true);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    if (!scene) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    scene.position.sub(center);

    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const desiredSize = 8;
    const scale = desiredSize / maxAxis;
    scene.scale.setScalar(scale);
  }, [scene]);

  useEffect(() => {
    if (!scene) return;

    scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.material = new THREE.MeshNormalMaterial({
        side: THREE.DoubleSide,
      });
    });
  }, [scene]);

  return (
    <primitive
      object={scene}
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

function formatPrice(value: unknown): string {
  if (value == null) return '—';

  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? Number(value)
      : Number((value as any)?.toString?.() ?? value);

  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString('ru-RU')} сом`;
  }

  return String(value);
}

function formatUnitType(type: Unit['type'] | string | null | undefined): string {
  switch (type) {
    case 'APARTMENT':
      return 'Квартира';
    case 'COMMERCIAL':
      return 'Коммерция';
    case 'PARKING':
      return 'Паркинг';
    default:
      return type ? String(type) : '—';
  }
}

function getMyDemoStatusText(display: DemoDisplay | null): string {
  if (!display) {
    return 'Demo-экран ещё не создан';
  }

  if (!display.isActive) {
    return 'Экран выключен';
  }

  if (!display.demoEnabled) {
    return 'Demo mode выключен';
  }

  if (display.currentUnitId) {
    return 'На ТВ выбран объект';
  }

  if (display.currentProjectId) {
    return 'На ТВ выбран проект';
  }

  if (display.autoplayEnabled) {
    return `Автодемо · ${display.autoplayDelaySec ?? 15} сек`;
  }

  return 'Экран активен';
}

function getPreferredUnitPlanImageUrl(unit: Unit | null): string | null {
  if (!unit) return null;

  const sortedVariants = [...(unit.planVariants ?? [])].sort((a, b) => {
    if (a.isDefault === b.isDefault) return 0;
    return a.isDefault ? -1 : 1;
  });

  return (
    sortedVariants.find((variant) => !!variant.planImageUrl)?.planImageUrl ??
    unit.planImageUrl ??
    null
  );
}

function getPreferredUnitPlanLabel(unit: Unit | null): string {
  if (!unit) return 'Планировка';

  const sortedVariants = [...(unit.planVariants ?? [])].sort((a, b) => {
    if (a.isDefault === b.isDefault) return 0;
    return a.isDefault ? -1 : 1;
  });

  const defaultVariant = sortedVariants.find((variant) => !!variant.planImageUrl);

  if (!defaultVariant) {
    return 'Планировка';
  }

  return defaultVariant.isDefault
    ? `Планировка · ${defaultVariant.name}`
    : defaultVariant.name;
}

function getProjectAddress(project: Project | null): string {
  if (!project) return '';
  const p = project as any;
  return p.fullAddress || p.address || p.addressLine || '';
}

function matchesText(unit: Unit, query: string): boolean {
  if (!query) return true;

  const haystack = [
    unit.number,
    unit.type,
    unit.status,
    unit.buildingId,
    unit.sectionId,
    unit.floorId,
    unit.rooms != null ? String(unit.rooms) : '',
    unit.area != null ? String(unit.area) : '',
    unit.price != null ? String(unit.price) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

const Viewer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [floorFilter, setFloorFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<UnitTypeFilter>('ALL');
  const [unitSearch, setUnitSearch] = useState('');

  const [myDemoDisplay, setMyDemoDisplay] = useState<DemoDisplay | null>(null);
  const [myDemoLoading, setMyDemoLoading] = useState(false);
  const [myDemoError, setMyDemoError] = useState<string | null>(null);

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const latestCleanupRef = useRef<{
    canSync: boolean;
  }>({
    canSync: false,
  });

  const requestedProjectId = searchParams.get('projectId');
  const requestedUnitId = searchParams.get('unitId');

  const setViewerSearchParams = (
    projectId: string | null,
    unitId: string | null,
  ) => {
    const next = new URLSearchParams();

    if (projectId) next.set('projectId', projectId);
    if (unitId) next.set('unitId', unitId);

    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setBuildingFilter('');
    setSectionFilter('');
    setFloorFilter('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setUnitSearch('');
  };

  const loadMainData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [projectsData, unitsData] = await Promise.all([
        fetchProjects(),
        fetchUnits({}),
      ]);

      setProjects(projectsData);
      setUnits(unitsData);

      let nextProjectId = '';
      let nextUnitId: string | null = null;

      if (
        requestedUnitId &&
        unitsData.some((u) => String(u.id) === String(requestedUnitId))
      ) {
        const requestedUnit =
          unitsData.find((u) => String(u.id) === String(requestedUnitId)) ?? null;

        if (requestedUnit) {
          nextProjectId = String(requestedUnit.projectId);
          nextUnitId = String(requestedUnit.id);
        }
      } else if (
        requestedProjectId &&
        projectsData.some((p) => String(p.id) === String(requestedProjectId))
      ) {
        nextProjectId = String(requestedProjectId);
      } else if (projectsData.length > 0) {
        nextProjectId = String(projectsData[0].id);
      }

      setSelectedProjectId(nextProjectId);
      setSelectedUnitId(nextUnitId);

      if (
        nextProjectId !== (requestedProjectId ?? '') ||
        (nextUnitId ?? '') !== (requestedUnitId ?? '')
      ) {
        setViewerSearchParams(nextProjectId || null, nextUnitId);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Не удалось загрузить проекты или объекты');
    } finally {
      setLoading(false);
    }
  };

  const loadMyDemoDisplay = useCallback(async () => {
    try {
      setMyDemoLoading(true);
      setMyDemoError(null);

      const display = await fetchMyDemoDisplay();
      setMyDemoDisplay(display);
    } catch (e: any) {
      console.error(e);

      const message = String(e?.message ?? '');
      const notFound =
        message.includes('404') ||
        message.toLowerCase().includes('not found') ||
        message.toLowerCase().includes('не найден');

      if (notFound) {
        setMyDemoDisplay(null);
        setMyDemoError(null);
      } else {
        setMyDemoError(e?.message ?? 'Не удалось загрузить demo-экран');
      }
    } finally {
      setMyDemoLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMainData();
    void loadMyDemoDisplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refresh = () => {
      void loadMyDemoDisplay();
    };

    const intervalId = window.setInterval(() => {
      void loadMyDemoDisplay();
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadMyDemoDisplay();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadMyDemoDisplay]);

  const currentProject = useMemo(
    () =>
      projects.find((p) => String(p.id) === String(selectedProjectId)) ?? null,
    [projects, selectedProjectId],
  );

  const projectUnits = useMemo(() => {
    if (!selectedProjectId) return units;
    return units.filter((u) => String(u.projectId) === String(selectedProjectId));
  }, [units, selectedProjectId]);

  const buildingOptions = useMemo(
    () =>
      Array.from(
        new Set(
          projectUnits
            .map((u) => u.buildingId)
            .filter((v): v is string => !!v),
        ),
      ).sort(),
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

  const visibleUnits = useMemo(() => {
    const normalizedQuery = unitSearch.trim().toLowerCase();

    return projectUnits.filter((u) => {
      if (buildingFilter && u.buildingId !== buildingFilter) return false;
      if (sectionFilter && u.sectionId !== sectionFilter) return false;
      if (floorFilter && u.floorId !== floorFilter) return false;
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && u.type !== typeFilter) return false;
      if (!matchesText(u, normalizedQuery)) return false;
      return true;
    });
  }, [
    projectUnits,
    buildingFilter,
    sectionFilter,
    floorFilter,
    statusFilter,
    typeFilter,
    unitSearch,
  ]);

  const unitsFor3D = visibleUnits.length > 0 ? visibleUnits : projectUnits;

  const selectedUnit = useMemo(
    () => units.find((u) => String(u.id) === String(selectedUnitId)) ?? null,
    [units, selectedUnitId],
  );

  const selectedUnitPlanUrl = useMemo(
    () => getPreferredUnitPlanImageUrl(selectedUnit),
    [selectedUnit],
  );

  const selectedUnitPlanLabel = useMemo(
    () => getPreferredUnitPlanLabel(selectedUnit),
    [selectedUnit],
  );

  const resolvedProjectModelUrl = useMemo(
    () => resolveAssetUrl(currentProject?.threeDModelUrl ?? null),
    [currentProject?.threeDModelUrl],
  );

  const resolvedProjectPreviewImage = useMemo(
    () => resolveAssetUrl(currentProject?.threeDPreviewImage ?? null),
    [currentProject?.threeDPreviewImage],
  );

  const resolvedSelectedUnitPlanUrl = useMemo(
    () => resolveAssetUrl(selectedUnitPlanUrl),
    [selectedUnitPlanUrl],
  );

  const projectStats = useMemo(() => {
    const free = projectUnits.filter((u) => u.status === 'FREE').length;
    const reserved = projectUnits.filter((u) => u.status === 'RESERVED').length;
    const sold = projectUnits.filter((u) => u.status === 'SOLD').length;
    const installment = projectUnits.filter(
      (u) => u.status === 'INSTALLMENT',
    ).length;

    return {
      total: projectUnits.length,
      free,
      reserved,
      sold,
      installment,
    };
  }, [projectUnits]);

  const canAutoSyncMyDemo = useMemo(() => {
    return !!(
      myDemoDisplay &&
      myDemoDisplay.isActive &&
      myDemoDisplay.demoEnabled
    );
  }, [myDemoDisplay]);

  useEffect(() => {
    setViewerMode(selectedUnit ? 'unit' : 'overview');
  }, [selectedUnit]);

  useEffect(() => {
    if (!selectedProjectId || !projects.length) return;

    const projectExists = projects.some(
      (p) => String(p.id) === String(selectedProjectId),
    );

    if (!projectExists) {
      const fallbackProjectId =
        projects.length > 0 ? String(projects[0].id) : '';
      setSelectedProjectId(fallbackProjectId);
      setSelectedUnitId(null);
      setViewerSearchParams(fallbackProjectId || null, null);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedUnit) return;

    if (String(selectedUnit.projectId) !== String(selectedProjectId)) {
      setSelectedProjectId(String(selectedUnit.projectId));
    }

    if (selectedUnit.buildingId) {
      setBuildingFilter(selectedUnit.buildingId);
    }

    if (selectedUnit.sectionId) {
      setSectionFilter(selectedUnit.sectionId);
    }

    if (selectedUnit.floorId) {
      setFloorFilter(selectedUnit.floorId);
    }
  }, [selectedUnit, selectedProjectId]);

  useEffect(() => {
    if (!selectedUnitId) return;

    const existsInAllUnits = units.some(
      (u) => String(u.id) === String(selectedUnitId),
    );

    if (!existsInAllUnits) {
      setSelectedUnitId(null);
      setViewerSearchParams(selectedProjectId || null, null);
    }
  }, [units, selectedUnitId, selectedProjectId]);

  useEffect(() => {
    setViewerSearchParams(selectedProjectId || null, selectedUnitId);
  }, [selectedProjectId, selectedUnitId]);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedUnitId(null);
    clearFilters();
    setRightPanelOpen(true);
  };

  const handleSelectUnitByElementKey = (elementKey: string) => {
    if (!elementKey) return;

    const unit = units.find((u) => u.modelElementKey === elementKey) ?? null;
    if (!unit) return;

    if (String(unit.projectId) !== String(selectedProjectId)) {
      setSelectedProjectId(String(unit.projectId));
      setBuildingFilter(unit.buildingId ?? '');
      setSectionFilter(unit.sectionId ?? '');
      setFloorFilter(unit.floorId ?? '');
    }

    setSelectedUnitId(String(unit.id));
    setRightPanelOpen(true);
  };

  const handleSelectUnit = (unit: Unit) => {
    if (String(unit.projectId) !== String(selectedProjectId)) {
      setSelectedProjectId(String(unit.projectId));
    }

    setBuildingFilter(unit.buildingId ?? '');
    setSectionFilter(unit.sectionId ?? '');
    setFloorFilter(unit.floorId ?? '');
    setSelectedUnitId(String(unit.id));
    setRightPanelOpen(true);
  };

  useEffect(() => {
    if (!canAutoSyncMyDemo) return;
    if (!selectedProjectId) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        const updated = await syncMyViewerState({
          projectId: selectedProjectId,
          unitId: viewerMode === 'unit' && selectedUnit ? selectedUnit.id : null,
          liveMode: true,
        });

        setMyDemoDisplay(updated);
      } catch (e) {
        console.error('syncMyViewerState error', e);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    canAutoSyncMyDemo,
    selectedProjectId,
    viewerMode,
    selectedUnit?.id,
  ]);

  useEffect(() => {
    if (!canAutoSyncMyDemo) return;

    const tick = async () => {
      try {
        const updated = await touchMyViewer();
        setMyDemoDisplay(updated);
      } catch (e) {
        console.error('touchMyViewer error', e);
      }
    };

    void tick();

    const id = window.setInterval(() => {
      void tick();
    }, 15000);

    return () => {
      window.clearInterval(id);
    };
  }, [canAutoSyncMyDemo]);

  useEffect(() => {
    latestCleanupRef.current = {
      canSync: canAutoSyncMyDemo,
    };
  }, [canAutoSyncMyDemo]);

  useEffect(() => {
    return () => {
      if (!latestCleanupRef.current.canSync) return;

      void syncMyViewerState({
        projectId: null,
        unitId: null,
        liveMode: false,
      });
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.viewerShell}>
        <div className={styles.viewerLoading}>Загрузка данных...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.viewerShell}>
        <div className={styles.viewerError}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.viewerShell}>
      <div className={styles.stage}>
        <Canvas
          camera={{ position: [0, 0, 10], fov: 40 }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#e8eef8']} />
          <fog attach="fog" args={['#e8eef8', 16, 42]} />
          <ambientLight intensity={1.4} />
          <hemisphereLight
            args={['#ffffff', '#cbd5e1', 1.5]}
          />
          <directionalLight position={[8, 12, 10]} intensity={1.9} />
          <directionalLight position={[-8, 6, -6]} intensity={0.9} />
          <directionalLight position={[0, -4, 8]} intensity={0.45} />
          <gridHelper args={[24, 24, '#94a3b8', '#cbd5e1']} position={[0, -4.25, 0]} />
          <axesHelper args={[4]} />

          <Suspense fallback={<Loader />}>
            {resolvedProjectModelUrl ? (
              <BuildingModel
                url={resolvedProjectModelUrl}
                units={unitsFor3D}
                selectedUnitId={selectedUnitId}
                onSelectUnitByElementKey={handleSelectUnitByElementKey}
              />
            ) : (
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[3, 3, 3]} />
                <meshStandardMaterial />
              </mesh>
            )}
          </Suspense>

          <OrbitControls makeDefault target={[0, 0, 0]} />
        </Canvas>

        {!resolvedProjectModelUrl && resolvedProjectPreviewImage && (
          <div className={styles.previewFallback}>
            <img
              src={resolvedProjectPreviewImage}
              alt={currentProject?.name ?? 'Project preview'}
              className={styles.previewFallbackImage}
            />
          </div>
        )}

        <div className={styles.stageVignette} />
      </div>

      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.topBarEyebrow}>Sales Viewer</div>
          <div className={styles.topBarTitle}>
            {currentProject ? currentProject.name : 'Проект не выбран'}
          </div>
          <div className={styles.topBarSubtitle}>
            {viewerMode === 'unit' && selectedUnit
              ? `Выбран объект ${selectedUnit.number ?? 'без номера'}`
              : 'Общий обзор проекта и подбор объектов'}
          </div>

          <div className={styles.topMetaRow}>
            <span className={styles.metaPill}>
              {getProjectAddress(currentProject) || 'Адрес не указан'}
            </span>
            <span className={styles.metaPill}>
              Объектов: {projectStats.total}
            </span>
            <span className={styles.metaPill}>
              Свободно: {projectStats.free}
            </span>
          </div>
        </div>

        <div className={styles.topBarRight}>
          <div className={styles.demoStatusPill}>
            {myDemoLoading ? 'Загрузка demo...' : getMyDemoStatusText(myDemoDisplay)}
          </div>

          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setLeftPanelOpen((v) => !v)}
          >
            {leftPanelOpen ? 'Скрыть навигацию' : 'Навигация'}
          </button>

          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setRightPanelOpen((v) => !v)}
          >
            {rightPanelOpen ? 'Скрыть карточку' : 'Карточка'}
          </button>
        </div>
      </div>

      <div className={styles.stageToolbar}>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => setSelectedUnitId(null)}
        >
          К проекту
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={clearFilters}
        >
          Сбросить фильтры
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => {
            setLeftPanelOpen(true);
            setRightPanelOpen(true);
          }}
        >
          Показать все панели
        </button>
      </div>

      <aside
        className={`${styles.sidePanel} ${styles.leftPanel} ${
          leftPanelOpen ? styles.sidePanelOpen : styles.sidePanelClosed
        }`}
      >
        <div className={styles.panelHeader}>
          <div>
            <h3>Навигация</h3>
            <div className={styles.panelSubhead}>Проекты и фильтры показа</div>
          </div>
          <span className={styles.panelCount}>{projects.length}</span>
        </div>

        <section className={styles.panelSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>Проекты</div>
            <div className={styles.sectionHint}>Выбор сцены для показа</div>
          </div>

          {projects.length === 0 ? (
            <p className={styles.helperText}>Пока нет ни одного проекта.</p>
          ) : (
            <ul className={styles.itemList}>
              {projects.map((p) => (
                <li
                  key={p.id}
                  className={
                    String(p.id) === String(selectedProjectId)
                      ? `${styles.listItem} ${styles.listItemActive}`
                      : styles.listItem
                  }
                  onClick={() => handleSelectProject(String(p.id))}
                >
                  <div className={styles.projectTitle}>
                    <strong>{p.name}</strong>
                  </div>
                  {getProjectAddress(p) && (
                    <div className={styles.itemMeta}>{getProjectAddress(p)}</div>
                  )}
                  <div className={styles.projectSignals}>
                    <span className={styles.signalPill}>
                      {p.threeDModelUrl ? '3D' : 'Нет 3D'}
                    </span>
                    <span className={styles.signalPill}>
                      {p.threeDPreviewImage ? 'Preview' : 'Без preview'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panelSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>Подбор объектов</div>
            <div className={styles.sectionHint}>Фильтры и быстрый поиск</div>
          </div>

          <div className={styles.quickFiltersRow}>
            <button
              type="button"
              className={`${styles.quickFilterButton} ${
                statusFilter === 'FREE' ? styles.quickFilterButtonActive : ''
              }`}
              onClick={() =>
                setStatusFilter((prev) => (prev === 'FREE' ? 'ALL' : 'FREE'))
              }
            >
              Только свободные
            </button>
            <button
              type="button"
              className={`${styles.quickFilterButton} ${
                typeFilter === 'APARTMENT' ? styles.quickFilterButtonActive : ''
              }`}
              onClick={() =>
                setTypeFilter((prev) =>
                  prev === 'APARTMENT' ? 'ALL' : 'APARTMENT',
                )
              }
            >
              Квартиры
            </button>
            <button
              type="button"
              className={`${styles.quickFilterButton} ${
                typeFilter === 'COMMERCIAL' ? styles.quickFilterButtonActive : ''
              }`}
              onClick={() =>
                setTypeFilter((prev) =>
                  prev === 'COMMERCIAL' ? 'ALL' : 'COMMERCIAL',
                )
              }
            >
              Коммерция
            </button>
          </div>

          <div className={styles.searchWrap}>
            <input
              type="text"
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              placeholder="Поиск по номеру, статусу, площади..."
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filtersBox}>
            <div className={styles.filterCol}>
              <label htmlFor="building-select">Дом / корпус</label>
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
              <label htmlFor="section-select">Секция</label>
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
              <label htmlFor="floor-select">Этаж</label>
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

            <div className={styles.filterCol}>
              <label htmlFor="status-select">Статус</label>
              <select
                id="status-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as UnitStatusFilter);
                  setSelectedUnitId(null);
                }}
              >
                <option value="ALL">Все</option>
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterCol}>
              <label htmlFor="type-select">Тип</label>
              <select
                id="type-select"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as UnitTypeFilter);
                  setSelectedUnitId(null);
                }}
              >
                <option value="ALL">Все</option>
                <option value="APARTMENT">Квартира</option>
                <option value="COMMERCIAL">Коммерция</option>
                <option value="PARKING">Паркинг</option>
              </select>
            </div>
          </div>

          <div className={styles.selectionSummary}>
            Показано объектов: <strong>{visibleUnits.length}</strong>{' '}
            {projectUnits.length > 0 && (
              <span className={styles.selectionSummaryMuted}>
                из {projectUnits.length}
              </span>
            )}
          </div>
        </section>
      </aside>

      <aside
        className={`${styles.sidePanel} ${styles.rightPanel} ${
          rightPanelOpen ? styles.sidePanelOpen : styles.sidePanelClosed
        }`}
      >
        <div className={styles.panelHeader}>
          <div>
            <h3>
              {selectedUnit ? 'Карточка объекта' : 'Объекты и summary проекта'}
            </h3>
            <div className={styles.panelSubhead}>
              {selectedUnit
                ? 'Подробности выбранного объекта'
                : 'Список объектов и обзор проекта'}
            </div>
          </div>
          <span className={styles.panelCount}>{unitsFor3D.length}</span>
        </div>

        {!selectedUnit && (
          <section className={styles.panelSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>Итог по проекту</div>
              <div className={styles.sectionHint}>Быстрый обзор наличия</div>
            </div>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Всего</div>
                <div className={styles.summaryValue}>{projectStats.total}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Свободно</div>
                <div className={styles.summaryValue}>{projectStats.free}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Резерв</div>
                <div className={styles.summaryValue}>{projectStats.reserved}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Продано</div>
                <div className={styles.summaryValue}>{projectStats.sold}</div>
              </div>
            </div>
          </section>
        )}

        <section className={styles.panelSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              {selectedUnit ? 'Другие объекты в проекте' : 'Список объектов'}
            </div>
            <div className={styles.sectionHint}>
              Выбор объекта для перехода к карточке
            </div>
          </div>

          {unitsFor3D.length === 0 ? (
            <p className={styles.helperText}>Для этого проекта пока нет объектов.</p>
          ) : (
            <ul className={styles.itemList}>
              {unitsFor3D.map((u) => {
                const meta = STATUS_META[u.status] ?? {
                  label: u.status,
                  color: '#6b7280',
                };

                return (
                  <li
                    key={u.id}
                    className={
                      String(u.id) === String(selectedUnitId)
                        ? `${styles.listItem} ${styles.listItemActive}`
                        : styles.listItem
                    }
                    onClick={() => handleSelectUnit(u)}
                  >
                    <div className={styles.unitTitleRow}>
                      <strong>{u.number ?? 'Без номера'}</strong>
                      <span className={styles.unitType}>
                        {formatUnitType(u.type)}
                      </span>
                    </div>

                    <div className={styles.itemMeta}>
                      <span
                        className={styles.unitStatusBadge}
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.label}
                      </span>
                      {u.area != null && <span>· {u.area} м²</span>}
                      {u.price != null && <span>· {formatPrice(u.price)}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selectedUnit && (
          <section className={styles.unitDetailsCard}>
            <div className={styles.unitDetailsHeader}>
              <div>
                <div className={styles.unitDetailsTitle}>
                  {selectedUnit.number ?? 'Без номера'}
                </div>
                <div className={styles.unitDetailsSubtitle}>
                  {formatUnitType(selectedUnit.type)}
                </div>
              </div>

              <button
                type="button"
                className={styles.smallGhostButton}
                onClick={() => setSelectedUnitId(null)}
              >
                К проекту
              </button>
            </div>

            <div className={styles.unitDetailsGrid}>
              <div className={styles.unitDetailsBlock}>
                <div className={styles.detailsSectionTitle}>Основные данные</div>
                <p>
                  <strong>Статус:</strong>{' '}
                  {
                    (STATUS_META[selectedUnit.status] ?? {
                      label: selectedUnit.status,
                    }).label
                  }
                </p>
                {selectedUnit.area != null && (
                  <p>
                    <strong>Площадь:</strong> {selectedUnit.area} м²
                  </p>
                )}
                {selectedUnit.rooms != null && (
                  <p>
                    <strong>Комнат:</strong> {selectedUnit.rooms}
                  </p>
                )}
                {selectedUnit.price != null && (
                  <p>
                    <strong>Цена:</strong> {formatPrice(selectedUnit.price)}
                  </p>
                )}
              </div>

              <div className={styles.unitDetailsBlock}>
                <div className={styles.detailsSectionTitle}>Расположение</div>
                <p>
                  <strong>Корпус:</strong> {selectedUnit.buildingId ?? '—'}
                </p>
                <p>
                  <strong>Секция:</strong> {selectedUnit.sectionId ?? '—'}
                </p>
                <p>
                  <strong>Этаж:</strong> {selectedUnit.floorId ?? '—'}
                </p>
              </div>

              {!!(selectedUnit.planVariants?.length ?? 0) && (
                <div className={styles.unitDetailsBlock}>
                  <div className={styles.detailsSectionTitle}>Варианты</div>
                  <p>
                    <strong>Планировок:</strong> {selectedUnit.planVariants?.length}
                  </p>
                </div>
              )}

              {resolvedSelectedUnitPlanUrl && (
                <div className={styles.planPreview}>
                  <p className={styles.planTitle}>{selectedUnitPlanLabel}</p>
                  <div className={styles.planImageWrapper}>
                    <img
                      src={resolvedSelectedUnitPlanUrl}
                      alt={`Планировка юнита ${
                        selectedUnit.number ?? selectedUnit.id
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {myDemoError && <div className={styles.errorTextCompact}>{myDemoError}</div>}
      </aside>

      <div className={styles.floatingLegend}>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className={styles.statusLegendItem}>
            <span
              className={styles.statusDot}
              style={{ backgroundColor: meta.color }}
            />
            <span className={styles.statusLegendLabel}>{meta.label}</span>
          </div>
        ))}
      </div>

      {!selectedUnit && (
        <div className={styles.bottomHint}>
          Выбери объект справа или кликни по 3D-модели проекта
        </div>
      )}
    </div>
  );
};

export default Viewer;
