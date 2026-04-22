// admin/src/pages/DemoScreen.tsx
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import {
  type DemoDisplayPublic as DemoDisplay,
  fetchDemoDisplayPublic,
  pingDemoDisplay,
} from '../api/demoDisplays';
import { type Project } from '../api/projects';
import { type Unit } from '../api/units';

type ThemeMode = 'dark' | 'light';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem('nh-theme');
  return stored === 'light' ? 'light' : 'dark';
}

// ===== Public fetch helpers (TV без авторизации) =====
const API_BASE = (() => {
  const raw = String((import.meta as any).env?.VITE_API_URL ?? '/api').trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

const PUBLIC_DATA_REFRESH_MS = 30000;
const DISPLAY_POLL_MS = 3000;
const PING_INTERVAL_MS = 30000;
const AUTOPLAY_MIN_DELAY_SEC = 3;
const AUTOPLAY_PROJECT_ROTATION_MULTIPLIER = 4;

async function requestPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.message === 'string') {
        message = data.message;
      } else if (Array.isArray(data?.message)) {
        message = data.message.join(', ');
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

async function requestPublicWithFallback<T>(paths: string[]): Promise<T> {
  let lastErr: any = null;

  for (const p of paths) {
    try {
      return await requestPublic<T>(p);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error('Request failed');
}

async function fetchProjectsPublic(): Promise<Project[]> {
  return requestPublicWithFallback<Project[]>(['/public/projects', '/projects']);
}

async function fetchUnitsPublic(): Promise<Unit[]> {
  return requestPublicWithFallback<Unit[]>(['/public/units', '/units']);
}

// ===== Status colors (как в Viewer) =====
const STATUS_META: Record<string, { label: string; color: string }> = {
  FREE: { label: 'Свободен', color: '#22c55e' },
  RESERVED: { label: 'Резерв', color: '#eab308' },
  SOLD: { label: 'Продан', color: '#ef4444' },
  INSTALLMENT: { label: 'Рассрочка', color: '#3b82f6' },
  EQUITY: { label: 'Долевое', color: '#a855f7' },
};

const Loader: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    const syncTheme = () => setTheme(getInitialTheme());
    const id = window.setInterval(syncTheme, 700);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'nh-theme') syncTheme();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const isLight = theme === 'light';

  return (
    <Html center>
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 999,
          background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.9)',
          color: isLight ? '#0f172a' : '#e5e7eb',
          fontSize: 14,
          border: isLight
            ? '1px solid rgba(148,163,184,0.28)'
            : '1px solid rgba(148,163,184,0.18)',
          boxShadow: isLight
            ? '0 10px 24px rgba(15,23,42,0.12)'
            : '0 10px 24px rgba(2,6,23,0.24)',
        }}
      >
        Загрузка 3D-сцены...
      </div>
    </Html>
  );
};

function idsEqual(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

type ColoredModelProps = {
  url: string;
  units: Unit[];
  highlightUnitId: string | null;
  rotate: boolean;
};

const ColoredBuildingModel: React.FC<ColoredModelProps> = ({
  url,
  units,
  highlightUnitId,
  rotate,
}) => {
  const gltf = useGLTF(url, true);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!scene) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    scene.position.sub(center);

    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const desiredSize = 10;
    const scale = desiredSize / maxAxis;
    scene.scale.setScalar(scale);
  }, [scene]);

  useFrame((_, delta) => {
    if (!rotate) return;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  useEffect(() => {
    if (!scene) return;

    const defaultColor = '#64748b';

    scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      const elementKey = mesh.name;
      if (!elementKey) return;

      const unit = units.find(
        (u) => u.modelElementKey && u.modelElementKey === elementKey,
      );

      const baseColor = unit
        ? (STATUS_META[unit.status]?.color ?? defaultColor)
        : defaultColor;

      const isHighlighted =
        !!unit && !!highlightUnitId && idsEqual(unit.id, highlightUnitId);

      const colorHex = isHighlighted ? '#ffffff' : baseColor;

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
  }, [scene, units, highlightUnitId]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
};

type DisplayMode = 'autoplay' | 'onAir' | 'idle';

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

function getProjectPreviewImage(project: Project | null): string | null {
  if (!project) return null;

  const p = project as any;
  return (
    p.threeDPreviewImage ??
    p.threeDPreviewImageUrl ??
    p.previewImageUrl ??
    null
  );
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

async function enterFullscreen() {
  const el = document.documentElement as any;

  try {
    if (document.fullscreenElement) return;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return;
    }
    if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
    }
  } catch (e) {
    console.warn('fullscreen failed', e);
  }
}

async function exitFullscreen() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }

    const doc: any = document;
    if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return;
    }
    if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    }
  } catch (e) {
    console.warn('exit fullscreen failed', e);
  }
}

const DemoScreen: React.FC = () => {
  const { code } = useParams<{ code: string }>();

  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  const [display, setDisplay] = useState<DemoDisplay | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [autoProjectIndex, setAutoProjectIndex] = useState(0);
  const [autoUnitIndex, setAutoUnitIndex] = useState(0);

  const [overlayVisible, setOverlayVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    !!document.fullscreenElement,
  );

  useEffect(() => {
    const syncTheme = () => setTheme(getInitialTheme());
    syncTheme();

    const id = window.setInterval(syncTheme, 700);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'nh-theme') {
        syncTheme();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const palette = useMemo(() => {
    if (theme === 'light') {
      return {
        pageBg:
          'radial-gradient(circle at top, rgba(59,130,246,0.10), transparent 52%), radial-gradient(circle at bottom right, rgba(16,185,129,0.08), transparent 38%), #eef4fb',
        stageBg: '#eef4fb',
        pageText: '#0f172a',
        mutedText: '#475569',
        overlayBg:
          'linear-gradient(135deg, rgba(255,255,255,0.90), rgba(248,250,252,0.82))',
        overlayBorder: '1px solid rgba(148,163,184,0.26)',
        overlayShadow: '0 14px 32px rgba(15,23,42,0.12)',
        overlaySoftShadow: '0 10px 24px rgba(15,23,42,0.08)',
        vignette:
          'linear-gradient(to bottom, rgba(255,255,255,0.16), rgba(255,255,255,0.02) 22%, rgba(255,255,255,0.02) 72%, rgba(15,23,42,0.08))',
        disabledOverlay: 'rgba(255,255,255,0.52)',
        emptyTitle: '#0f172a',
        emptyText: '#475569',
        imageCardBg: '#ffffff',
      };
    }

    return {
      pageBg:
        'radial-gradient(circle at top, rgba(56,189,248,0.12), transparent 52%), radial-gradient(circle at bottom right, rgba(59,130,246,0.08), transparent 38%), #020617',
      stageBg: '#020617',
      pageText: '#e5e7eb',
      mutedText: '#cbd5e1',
      overlayBg:
        'linear-gradient(135deg, rgba(15,23,42,0.90), rgba(15,23,42,0.72))',
      overlayBorder: '1px solid rgba(148,163,184,0.22)',
      overlayShadow: '0 16px 34px rgba(2,6,23,0.30)',
      overlaySoftShadow: '0 10px 24px rgba(2,6,23,0.24)',
      vignette:
        'linear-gradient(to bottom, rgba(2,6,23,0.46), rgba(2,6,23,0.02) 22%, rgba(2,6,23,0.02) 72%, rgba(2,6,23,0.42))',
      disabledOverlay: 'rgba(2,6,23,0.58)',
      emptyTitle: '#e5e7eb',
      emptyText: '#cbd5e1',
      imageCardBg: '#0f172a',
    };
  }, [theme]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!code) return;

    let cancelled = false;
    let displayPollId: number | undefined;
    let publicRefreshId: number | undefined;

    const loadPublicData = async () => {
      const [projectsData, unitsData] = await Promise.all([
        fetchProjectsPublic(),
        fetchUnitsPublic(),
      ]);

      if (cancelled) return;

      setProjects(projectsData);
      setUnits(unitsData);
    };

    const loadDisplay = async () => {
      const displayData = await fetchDemoDisplayPublic(code);

      if (cancelled) return;

      setDisplay(displayData);
    };

    const loadOnce = async () => {
      try {
        setLoading(true);
        setError(null);

        await Promise.all([loadDisplay(), loadPublicData()]);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message ?? 'Ошибка загрузки демо-дисплея');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const startPolling = () => {
      displayPollId = window.setInterval(async () => {
        try {
          await loadDisplay();
        } catch (e) {
          console.warn('Demo polling error', e);
        }
      }, DISPLAY_POLL_MS);

      publicRefreshId = window.setInterval(async () => {
        try {
          await loadPublicData();
        } catch (e) {
          console.warn('Public data refresh error', e);
        }
      }, PUBLIC_DATA_REFRESH_MS);
    };

    void loadOnce().then(() => {
      if (!cancelled) startPolling();
    });

    return () => {
      cancelled = true;
      if (displayPollId) window.clearInterval(displayPollId);
      if (publicRefreshId) window.clearInterval(publicRefreshId);
    };
  }, [code]);

  useEffect(() => {
    if (!code) return;

    let cancelled = false;

    const ping = async () => {
      try {
        await pingDemoDisplay(code);
      } catch (e) {
        if (cancelled) return;
        console.warn('Ping error', e);
      }
    };

    void ping();

    const id = window.setInterval(() => {
      void ping();
    }, PING_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [code]);

  const onAirUnit = useMemo(() => {
    if (!display?.currentUnitId || !units.length) return null;
    return units.find((u) => idsEqual(u.id, display.currentUnitId)) ?? null;
  }, [display, units]);

  const displayMode: DisplayMode = useMemo(() => {
    if (!display) return 'idle';
    if (!display.isActive) return 'idle';
    if (!display.demoEnabled) return 'idle';

    if (display.currentProjectId || display.currentUnitId) return 'onAir';
    if (display.autoplayEnabled) return 'autoplay';

    return 'idle';
  }, [display]);

  const autoplayProjectList = useMemo(() => {
    if (!display || !projects.length) return [] as Project[];
    if (!display.demoEnabled) return [] as Project[];

    if (display.autoplayProjectId) {
      const p = projects.find((pr) => idsEqual(pr.id, display.autoplayProjectId));
      return p ? [p] : projects;
    }

    return projects;
  }, [display, projects]);

  const shouldRotateAutoplayProjects = useMemo(() => {
    return (
      displayMode === 'autoplay' &&
      !display?.autoplayProjectId &&
      autoplayProjectList.length > 1
    );
  }, [displayMode, display?.autoplayProjectId, autoplayProjectList.length]);

  useEffect(() => {
    setAutoProjectIndex(0);
  }, [display?.id, display?.autoplayProjectId, projects.length]);

  useEffect(() => {
    if (!display) return;
    if (!shouldRotateAutoplayProjects) return;

    const delaySec = display.autoplayDelaySec ?? 15;
    const delayMs =
      Math.max(delaySec, AUTOPLAY_MIN_DELAY_SEC) *
      1000 *
      AUTOPLAY_PROJECT_ROTATION_MULTIPLIER;

    const id = window.setInterval(() => {
      setAutoProjectIndex((prev) => {
        const len = autoplayProjectList.length || 1;
        return (prev + 1) % len;
      });
    }, delayMs);

    return () => {
      window.clearInterval(id);
    };
  }, [display, shouldRotateAutoplayProjects, autoplayProjectList]);

  const idleProject = useMemo(() => {
    if (!display || !projects.length) return null;

    const preferredProjectId =
      display.currentProjectId ?? display.autoplayProjectId ?? null;

    if (preferredProjectId) {
      return projects.find((p) => idsEqual(p.id, preferredProjectId)) ?? null;
    }

    return projects[0] ?? null;
  }, [display, projects]);

  const activeProject = useMemo(() => {
    if (!projects.length || !display) return null;

    if (displayMode === 'autoplay') {
      if (!autoplayProjectList.length) return null;
      const index =
        autoplayProjectList.length > 0
          ? autoProjectIndex % autoplayProjectList.length
          : 0;
      return autoplayProjectList[index] ?? null;
    }

    if (displayMode === 'onAir') {
      const explicitProjectId = display.currentProjectId;
      if (explicitProjectId) {
        return projects.find((p) => idsEqual(p.id, explicitProjectId)) ?? null;
      }

      if (onAirUnit?.projectId) {
        return projects.find((p) => idsEqual(p.id, onAirUnit.projectId)) ?? null;
      }
    }

    return idleProject;
  }, [
    projects,
    display,
    displayMode,
    autoplayProjectList,
    autoProjectIndex,
    onAirUnit,
    idleProject,
  ]);

  const activeProjectUnits = useMemo(() => {
    if (!activeProject) return [] as Unit[];
    return units.filter((u) => idsEqual(u.projectId, activeProject.id));
  }, [units, activeProject]);

  const autoplayUnits = useMemo(() => {
    const withKeys = activeProjectUnits.filter((u) => !!u.modelElementKey);
    return withKeys.length > 0 ? withKeys : activeProjectUnits;
  }, [activeProjectUnits]);

  useEffect(() => {
    setAutoUnitIndex(0);
  }, [activeProject?.id, displayMode]);

  useEffect(() => {
    if (displayMode !== 'autoplay') return;
    if (!display) return;
    if (!autoplayUnits.length) return;
    if (autoplayUnits.length <= 1) return;

    const delaySec = display.autoplayDelaySec ?? 15;
    const delayMs = Math.max(delaySec, AUTOPLAY_MIN_DELAY_SEC) * 1000;

    const id = window.setInterval(() => {
      setAutoUnitIndex((prev) => (prev + 1) % (autoplayUnits.length || 1));
    }, delayMs);

    return () => window.clearInterval(id);
  }, [displayMode, display, autoplayUnits]);

  const autoplayUnit = useMemo(() => {
    if (!autoplayUnits.length) return null;
    return autoplayUnits[autoUnitIndex % autoplayUnits.length] ?? null;
  }, [autoplayUnits, autoUnitIndex]);

  const effectiveUnit = useMemo(() => {
    if (displayMode === 'onAir') return onAirUnit;
    if (displayMode === 'autoplay') return autoplayUnit;
    return null;
  }, [displayMode, onAirUnit, autoplayUnit]);

  const effectiveUnitPlanUrl = useMemo(
    () => getPreferredUnitPlanImageUrl(effectiveUnit),
    [effectiveUnit],
  );

  const highlightUnitId = effectiveUnit ? String(effectiveUnit.id) : null;

  const modeLabel = useMemo(() => {
    if (!display?.isActive) return 'Экран выключен';
    if (!display?.demoEnabled) return 'Demo off';

    switch (displayMode) {
      case 'autoplay':
        return 'Автодемо';
      case 'onAir':
        return 'Live';
      default:
        return 'Ожидание';
    }
  }, [displayMode, display?.isActive, display?.demoEnabled]);

  if (!code) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: palette.stageBg,
          color: palette.pageText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
      >
        Не передан код демо-дисплея
      </div>
    );
  }

  if (loading && !display) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: palette.stageBg,
          color: palette.pageText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
      >
        Загрузка демо-экрана...
      </div>
    );
  }

  if (error && !display) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: palette.stageBg,
          color: theme === 'light' ? '#b91c1c' : '#fecaca',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          padding: 24,
          textAlign: 'center',
        }}
      >
        {error}
      </div>
    );
  }

  if (!display) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: palette.stageBg,
          color: palette.pageText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}
      >
        Демо-дисплей не найден
      </div>
    );
  }

  const title = display.name || `Экран ${display.code}`;
  const officeLabel = display.office || 'Офис не указан';
  const projectPreview = getProjectPreviewImage(activeProject);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: palette.pageBg,
        color: palette.pageText,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* main stage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          backgroundColor: palette.stageBg,
        }}
      >
        {activeProject && activeProject.threeDModelUrl ? (
          <Canvas
            camera={{ position: [0, 0, 14], fov: 38 }}
            style={{ width: '100%', height: '100%' }}
          >
            <color attach="background" args={[palette.stageBg]} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[6, 10, 6]} intensity={1.1} />
            <Suspense fallback={<Loader />}>
              <ColoredBuildingModel
                url={activeProject.threeDModelUrl}
                units={activeProjectUnits}
                highlightUnitId={highlightUnitId}
                rotate={displayMode === 'autoplay'}
              />
            </Suspense>
            <OrbitControls enableZoom={false} enablePan={false} />
          </Canvas>
        ) : activeProject && projectPreview ? (
          <img
            src={projectPreview}
            alt={activeProject.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              inset: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
              padding: 24,
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: palette.emptyTitle,
              }}
            >
              {display.demoEnabled
                ? activeProject?.name || 'Нет выбранного проекта'
                : 'Экран готов к подключению'}
            </div>
            <div
              style={{
                fontSize: 15,
                color: palette.emptyText,
                maxWidth: 640,
                textAlign: 'center',
                lineHeight: 1.55,
              }}
            >
              {!display.demoEnabled
                ? 'Demo mode сейчас выключен'
                : 'Настрой 3D-модель проекта или включи трансляцию из CRM'}
            </div>
          </div>
        )}
      </div>

      {/* soft vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: palette.vignette,
          pointerEvents: 'none',
        }}
      />

      {/* top control strip */}
      {overlayVisible && (
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: 18,
            right: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 14,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 18,
              border: palette.overlayBorder,
              background: palette.overlayBg,
              backdropFilter: 'blur(12px)',
              maxWidth: 520,
              boxShadow: palette.overlayShadow,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background:
                  !display.isActive
                    ? '#94a3b8'
                    : !display.demoEnabled
                      ? '#f59e0b'
                      : displayMode === 'onAir'
                        ? '#22c55e'
                        : displayMode === 'autoplay'
                          ? '#60a5fa'
                          : '#eab308',
                boxShadow:
                  displayMode === 'onAir'
                    ? '0 0 0 6px rgba(34,197,94,0.14)'
                    : '0 0 0 6px rgba(148,163,184,0.10)',
                flex: '0 0 auto',
              }}
            />

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  opacity: 0.56,
                  marginBottom: 3,
                }}
              >
                Demo screen
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 750,
                  lineHeight: 1.15,
                  color: palette.pageText,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: palette.mutedText,
                  marginTop: 4,
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span>{officeLabel}</span>
                <span>•</span>
                <span>{modeLabel}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 16,
                border: palette.overlayBorder,
                background: palette.overlayBg,
                backdropFilter: 'blur(10px)',
                fontSize: 12,
                color: palette.mutedText,
                boxShadow: palette.overlaySoftShadow,
              }}
            >
              Код: <b style={{ color: palette.pageText }}>{display.code}</b>
            </div>

            <button
              type="button"
              onClick={() =>
                isFullscreen ? void exitFullscreen() : void enterFullscreen()
              }
              style={{
                borderRadius: 16,
                padding: '9px 12px',
                border: palette.overlayBorder,
                background: palette.overlayBg,
                color: palette.pageText,
                cursor: 'pointer',
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                boxShadow: palette.overlaySoftShadow,
              }}
            >
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </button>

            <button
              type="button"
              onClick={() => setOverlayVisible(false)}
              style={{
                borderRadius: 16,
                padding: '9px 12px',
                border: palette.overlayBorder,
                background: palette.overlayBg,
                color: palette.pageText,
                cursor: 'pointer',
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                boxShadow: palette.overlaySoftShadow,
              }}
            >
              Скрыть UI
            </button>
          </div>
        </div>
      )}

      {!overlayVisible && (
        <button
          type="button"
          onClick={() => setOverlayVisible(true)}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            zIndex: 20,
            borderRadius: 16,
            padding: '9px 12px',
            border: palette.overlayBorder,
            background: palette.overlayBg,
            color: palette.pageText,
            cursor: 'pointer',
            fontWeight: 600,
            backdropFilter: 'blur(10px)',
            boxShadow: palette.overlaySoftShadow,
          }}
        >
          Показать UI
        </button>
      )}

      {!display.isActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: palette.disabledOverlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                marginBottom: 10,
                color: palette.pageText,
              }}
            >
              Экран выключен
            </div>
            <div style={{ fontSize: 16, color: palette.mutedText }}>
              Активируй его в CRM через TV / Demo
            </div>
          </div>
        </div>
      )}

      {display.isActive && !display.demoEnabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: palette.disabledOverlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                marginBottom: 10,
                color: palette.pageText,
              }}
            >
              Demo mode выключен
            </div>
            <div style={{ fontSize: 16, color: palette.mutedText }}>
              Экран подключён и ждёт включения demo mode в CRM
            </div>
          </div>
        </div>
      )}

      {overlayVisible && display.isActive && display.demoEnabled && activeProject && (
        <div
          style={{
            position: 'absolute',
            left: 18,
            bottom: 18,
            maxWidth: 460,
            padding: '12px 14px',
            borderRadius: 18,
            border: palette.overlayBorder,
            background: palette.overlayBg,
            backdropFilter: 'blur(12px)',
            boxShadow: palette.overlayShadow,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              color: palette.mutedText,
              marginBottom: 4,
              letterSpacing: 1,
            }}
          >
            Проект
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 750,
              lineHeight: 1.15,
              color: palette.pageText,
            }}
          >
            {activeProject.name}
          </div>
          {activeProject.address && (
            <div
              style={{
                fontSize: 13,
                color: palette.mutedText,
                marginTop: 6,
                lineHeight: 1.45,
              }}
            >
              {activeProject.address}
            </div>
          )}
        </div>
      )}

      {overlayVisible && display.isActive && display.demoEnabled && effectiveUnit && (
        <div
          style={{
            position: 'absolute',
            right: 18,
            bottom: 18,
            maxWidth: 500,
            padding: '14px',
            borderRadius: 18,
            border: palette.overlayBorder,
            background: palette.overlayBg,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            gap: 12,
            alignItems: 'stretch',
            boxShadow: palette.overlayShadow,
          }}
        >
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                color: palette.mutedText,
                marginBottom: 4,
                letterSpacing: 1,
              }}
            >
              {displayMode === 'onAir' ? 'Выбранный объект' : 'Автопоказ'}
            </div>

            <div
              style={{
                fontSize: 18,
                fontWeight: 750,
                marginBottom: 4,
                color: palette.pageText,
              }}
            >
              {effectiveUnit.number ?? 'Без номера'}
            </div>

            <div
              style={{
                fontSize: 12,
                color: palette.mutedText,
                marginBottom: 8,
              }}
            >
              {effectiveUnit.type}
              {effectiveUnit.rooms != null
                ? ` · ${effectiveUnit.rooms} комн.`
                : ''}
              {effectiveUnit.area ? ` · ${effectiveUnit.area} м²` : ''}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                marginBottom: 8,
                color: palette.pageText,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    STATUS_META[effectiveUnit.status]?.color ?? '#94a3b8',
                }}
              />
              <span>
                {STATUS_META[effectiveUnit.status]?.label ?? effectiveUnit.status}
              </span>
            </div>

            {effectiveUnit.price != null && (
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: palette.pageText,
                }}
              >
                {formatPrice(effectiveUnit.price)}
              </div>
            )}
          </div>

          {effectiveUnitPlanUrl && (
            <div
              style={{
                flex: '0 0 156px',
                borderRadius: 14,
                overflow: 'hidden',
                border: palette.overlayBorder,
                background: palette.imageCardBg,
              }}
            >
              <img
                src={effectiveUnitPlanUrl}
                alt={`Планировка юнита ${
                  effectiveUnit.number ?? effectiveUnit.id
                }`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DemoScreen;