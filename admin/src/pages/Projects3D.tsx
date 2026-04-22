
import React, {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from 'react';
import {
  fetchStudioProjects,
  publishResolvedProject3D,
  updateProject3D,
  uploadProject3DModel,
  type StudioProject,
  type UpdateProject3DPayload,
} from '../api/projects';
import { fetchUnits, type Unit } from '../api/units';
import {
  createProject3DAssetDraft,
  fetchProject3DAssetsByProject,
  publishProject3DAsset,
  setProject3DAssetStatus,
  type Project3DAsset,
} from '../api/project3DAssets';
import {
  fetchProject3DBindingsByProject,
  type Project3DBinding,
} from '../api/project3DBindings';

type ProjectDraft = {
  threeDModelUrl: string;
  threeDModelFormat: string;
  threeDPreviewImage: string;
  saving?: boolean;
  uploadingModel?: boolean;
  message?: string | null;
};

type ProjectAssetsState = {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  items: Project3DAsset[];
  createName: string;
  creating: boolean;
  actionMessage?: string | null;
  actionLoadingAssetId?: string | null;
  publishToViewerLoading?: boolean;
};

type ProjectBindingsState = {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  items: Project3DBinding[];
};

type ProjectTab = 'overview' | 'runtime' | 'assets' | 'bindings' | 'diagnostics';

const TABS: Array<{ key: ProjectTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'runtime', label: 'Runtime' },
  { key: 'assets', label: 'Assets' },
  { key: 'bindings', label: 'Bindings' },
  { key: 'diagnostics', label: 'Diagnostics' },
];

const containerStyle: CSSProperties = {
  padding: '0 24px 32px',
  maxWidth: 1440,
  margin: '0 auto',
  color: 'var(--nh-text-main)',
};

const heroCard: CSSProperties = {
  marginTop: 8,
  padding: 20,
  borderRadius: 22,
  border: '1px solid var(--nh-border-subtle)',
  background:
    'radial-gradient(circle at top left, var(--nh-accent-soft), transparent 58%), var(--nh-bg-elevated)',
  color: 'var(--nh-text-main)',
  boxShadow: '0 18px 36px rgba(15,23,42,0.24)',
};

const metricCard: CSSProperties = {
  borderRadius: 16,
  border: '1px solid var(--nh-border-subtle)',
  background: 'var(--nh-bg-elevated)',
  padding: 14,
};

const sectionCard: CSSProperties = {
  marginTop: 14,
  padding: 18,
  borderRadius: 20,
  border: '1px solid var(--nh-border-subtle)',
  background: 'var(--nh-bg-elevated)',
  color: 'var(--nh-text-main)',
  boxShadow: '0 12px 28px rgba(15,23,42,0.18)',
};

const panelCard: CSSProperties = {
  borderRadius: 16,
  border: '1px solid var(--nh-border-subtle)',
  background: 'var(--nh-bg-main)',
  padding: 16,
};

const subtleCard: CSSProperties = {
  borderRadius: 14,
  border: '1px solid var(--nh-border-subtle)',
  background: 'var(--nh-bg-elevated)',
  padding: 12,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  borderRadius: 12,
  border: '1px solid var(--nh-border-subtle)',
  backgroundColor: 'var(--nh-bg-main)',
  color: 'var(--nh-text-main)',
  fontSize: 13,
  outline: 'none',
};

const saveBtn: CSSProperties = {
  padding: '9px 15px',
  borderRadius: 999,
  border: 'none',
  background: 'var(--nh-accent)',
  color: '#f9fafb',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const ghostBtn: CSSProperties = {
  padding: '9px 15px',
  borderRadius: 999,
  border: '1px solid var(--nh-border-subtle)',
  background: 'var(--nh-bg-main)',
  color: 'var(--nh-text-main)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

function getProjectAddress(project: StudioProject): string {
  const p = project as any;
  return p.fullAddress || p.address || p.addressLine || '';
}

function getInitialDraft(project: StudioProject): ProjectDraft {
  return {
    threeDModelUrl: project.threeDModelUrl ?? '',
    threeDModelFormat: project.threeDModelFormat ?? '',
    threeDPreviewImage: project.threeDPreviewImage ?? '',
    saving: false,
    uploadingModel: false,
    message: null,
  };
}

function inferFormatFromUrl(url: string): string {
  const lower = url.toLowerCase().trim();
  if (!lower) return '';
  if (lower.endsWith('.glb')) return 'glb';
  if (lower.endsWith('.gltf')) return 'gltf';
  if (lower.endsWith('.obj')) return 'obj';
  if (lower.endsWith('.fbx')) return 'fbx';
  if (lower.endsWith('.zip')) return 'zip';
  return '';
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function getAssetStateLabel(asset: Project3DAsset): {
  label: string;
  bg: string;
  color: string;
} {
  switch (asset.status) {
    case 'PUBLISHED':
      return {
        label: 'Published',
        bg: 'rgba(34,197,94,0.12)',
        color: '#166534',
      };
    case 'READY':
      return {
        label: 'Ready',
        bg: 'rgba(59,130,246,0.12)',
        color: '#1d4ed8',
      };
    case 'PROCESSING':
      return {
        label: 'Processing',
        bg: 'rgba(250,204,21,0.16)',
        color: '#92400e',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        bg: 'rgba(239,68,68,0.14)',
        color: '#b91c1c',
      };
    case 'ARCHIVED':
      return {
        label: 'Archived',
        bg: 'rgba(148,163,184,0.18)',
        color: '#475569',
      };
    default:
      return {
        label: 'Draft',
        bg: 'rgba(148,163,184,0.18)',
        color: '#334155',
      };
  }
}

function createEmptyAssetsState(): ProjectAssetsState {
  return {
    loading: false,
    loaded: false,
    error: null,
    items: [],
    createName: '',
    creating: false,
    actionMessage: null,
    actionLoadingAssetId: null,
    publishToViewerLoading: false,
  };
}

function createEmptyBindingsState(): ProjectBindingsState {
  return {
    loading: false,
    loaded: false,
    error: null,
    items: [],
  };
}

function getPrimaryUnitBinding(
  unitId: string,
  bindingsState?: ProjectBindingsState,
): Project3DBinding | null {
  if (!bindingsState?.items?.length) return null;

  return (
    bindingsState.items.find(
      (binding) =>
        binding.targetType === 'UNIT' &&
        binding.unitId === unitId &&
        binding.isPrimary,
    ) ?? null
  );
}

function getBindingKey(
  unit: Unit,
  bindingsState?: ProjectBindingsState,
): string {
  const primaryBinding = getPrimaryUnitBinding(unit.id, bindingsState);

  if (primaryBinding?.nodeKey) {
    return String(primaryBinding.nodeKey).trim();
  }

  return String((unit as any).modelElementKey ?? '').trim();
}

function hasUnknownValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

function getAssetNotes(asset: Project3DAsset): string | null {
  const value = (asset as any)?.notes;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getAssetDiagnostics(asset: Project3DAsset): unknown {
  return (asset as any)?.diagnosticsJson;
}

function getBindingTargetLabel(binding: Project3DBinding): string {
  switch (binding.targetType) {
    case 'UNIT':
      return `Unit ${binding.unitId ?? '—'}`;
    case 'BUILDING':
      return `Building ${binding.buildingId ?? '—'}`;
    case 'SECTION':
      return `Section ${binding.sectionId ?? '—'}`;
    case 'FLOOR':
      return `Floor ${binding.floorId ?? '—'}`;
    default:
      return binding.targetType;
  }
}

const Projects3DPage: React.FC = () => {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ProjectDraft>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<Record<string, ProjectTab>>({});
  const [assetsByProject, setAssetsByProject] = useState<
    Record<string, ProjectAssetsState>
  >({});
  const [bindingsByProject, setBindingsByProject] = useState<
    Record<string, ProjectBindingsState>
  >({});
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadProjects = async (): Promise<StudioProject[]> => {
    setError(null);

    try {
      const data = await fetchStudioProjects();
      setProjects(data);

      setDrafts((prev) => {
        const next = { ...prev };

        data.forEach((project) => {
          const previous = next[project.id];

          next[project.id] = {
            threeDModelUrl: project.threeDModelUrl ?? '',
            threeDModelFormat: project.threeDModelFormat ?? '',
            threeDPreviewImage: project.threeDPreviewImage ?? '',
            saving: previous?.saving ?? false,
            uploadingModel: previous?.uploadingModel ?? false,
            message: previous?.message ?? null,
          };
        });

        return next;
      });

      if (data[0]) {
        setExpanded((prev) =>
          Object.keys(prev).length ? prev : { [data[0].id]: true },
        );
        setActiveTab((prev) =>
          Object.keys(prev).length ? prev : { [data[0].id]: 'overview' },
        );
      }

      return data;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Ошибка при загрузке списка проектов',
      );
      return [];
    }
  };

  const loadUnits = async () => {
    setUnitsError(null);

    try {
      const data = await fetchUnits({});
      setUnits(data as Unit[]);
    } catch (e) {
      setUnitsError(
        e instanceof Error ? e.message : 'Ошибка при загрузке юнитов',
      );
    } finally {
      setUnitsLoading(false);
    }
  };

  const loadProjectBindings = async (projectId: string, force = false) => {
    setBindingsByProject((prev) => {
      const current = prev[projectId] ?? createEmptyBindingsState();

      if (current.loaded && !force) {
        return prev;
      }

      return {
        ...prev,
        [projectId]: {
          ...current,
          loading: true,
          error: null,
        },
      };
    });

    try {
      const items = await fetchProject3DBindingsByProject(projectId);

      setBindingsByProject((prev) => ({
        ...prev,
        [projectId]: {
          loading: false,
          loaded: true,
          error: null,
          items,
        },
      }));
    } catch (e) {
      setBindingsByProject((prev) => ({
        ...prev,
        [projectId]: {
          ...(prev[projectId] ?? createEmptyBindingsState()),
          loading: false,
          loaded: false,
          error:
            e instanceof Error
              ? e.message
              : 'Не удалось загрузить bindings проекта',
        },
      }));
    }
  };

  const loadBindingsForProjects = async (
    projectIds: string[],
    force = false,
  ) => {
    await Promise.all(
      projectIds.map((projectId) => loadProjectBindings(projectId, force)),
    );
  };

  const loadProjectAssets = async (projectId: string, force = false) => {
    setAssetsByProject((prev) => {
      const current = prev[projectId] ?? createEmptyAssetsState();

      if (current.loaded && !force) {
        return prev;
      }

      return {
        ...prev,
        [projectId]: {
          ...current,
          loading: true,
          error: null,
          actionMessage: null,
        },
      };
    });

    try {
      const items = await fetchProject3DAssetsByProject(projectId);

      setAssetsByProject((prev) => ({
        ...prev,
        [projectId]: {
          ...(prev[projectId] ?? createEmptyAssetsState()),
          loading: false,
          loaded: true,
          error: null,
          items,
        },
      }));
    } catch (e) {
      setAssetsByProject((prev) => ({
        ...prev,
        [projectId]: {
          ...(prev[projectId] ?? createEmptyAssetsState()),
          loading: false,
          loaded: false,
          error:
            e instanceof Error
              ? e.message
              : 'Не удалось загрузить 3D-ассеты проекта',
        },
      }));
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    setUnitsLoading(true);

    try {
      const loadedProjects = await loadProjects();
      await Promise.all([
        loadUnits(),
        loadBindingsForProjects(
          loadedProjects.map((project) => project.id),
          true,
        ),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setUnitsLoading(true);

      try {
        const loadedProjects = await loadProjects();
        await Promise.all([
          loadUnits(),
          loadBindingsForProjects(loadedProjects.map((p) => p.id)),
        ]);
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
  }, []);

  const unitsByProject = useMemo(() => {
    const map: Record<string, Unit[]> = {};

    units.forEach((unit) => {
      const projectId = String((unit as any).projectId ?? '').trim();
      if (!projectId) return;

      if (!map[projectId]) {
        map[projectId] = [];
      }

      map[projectId].push(unit);
    });

    return map;
  }, [units]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;

    return projects.filter((project) => {
      const draft = drafts[project.id] ?? getInitialDraft(project);

      const haystack = [
        project.name,
        getProjectAddress(project),
        project.description,
        draft.threeDModelUrl,
        draft.threeDModelFormat,
        draft.threeDPreviewImage,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [projects, drafts, query]);

  const summary = useMemo(() => {
    let projectsWithModel = 0;
    let projectsWithPreview = 0;
    let totalUnits = 0;
    let linkedUnits = 0;
    let totalAssets = 0;
    let publishedAssets = 0;

    projects.forEach((project) => {
      const draft = drafts[project.id] ?? getInitialDraft(project);

      if (draft.threeDModelUrl.trim()) projectsWithModel += 1;
      if (draft.threeDPreviewImage.trim()) projectsWithPreview += 1;

      const bindingsState = bindingsByProject[project.id];
      const projectUnits = unitsByProject[project.id] ?? [];

      totalUnits += projectUnits.length;
      linkedUnits += projectUnits.filter((unit) =>
        Boolean(getBindingKey(unit, bindingsState)),
      ).length;

      const assets = assetsByProject[project.id]?.items ?? [];
      totalAssets += assets.length;
      publishedAssets += assets.filter((asset) => asset.isPublished).length;
    });

    return {
      totalProjects: projects.length,
      projectsWithModel,
      projectsWithPreview,
      totalUnits,
      linkedUnits,
      unlinkedUnits: Math.max(totalUnits - linkedUnits, 0),
      totalAssets,
      publishedAssets,
    };
  }, [projects, drafts, unitsByProject, assetsByProject, bindingsByProject]);

  const updateDraftField = (
    projectId: string,
    field: keyof Pick<
      ProjectDraft,
      'threeDModelUrl' | 'threeDModelFormat' | 'threeDPreviewImage'
    >,
    value: string,
  ) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    setDrafts((prev) => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] ?? getInitialDraft(project)),
        [field]: value,
      },
    }));
  };

  const setProjectAssetsState = (
    projectId: string,
    patch: Partial<ProjectAssetsState>,
  ) => {
    setAssetsByProject((prev) => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] ?? createEmptyAssetsState()),
        ...patch,
      },
    }));
  };

  const toggleExpanded = (projectId: string) => {
    const willOpen = !expanded[projectId];

    setExpanded((prev) => ({
      ...prev,
      [projectId]: willOpen,
    }));

    if (willOpen) {
      setActiveTab((prev) => ({
        ...prev,
        [projectId]: prev[projectId] ?? 'overview',
      }));
      void Promise.all([
        loadProjectAssets(projectId),
        loadProjectBindings(projectId),
      ]);
    }
  };

  const openProjectTab = (projectId: string, tab: ProjectTab) => {
    setActiveTab((prev) => ({
      ...prev,
      [projectId]: tab,
    }));

    if (tab === 'assets') {
      void loadProjectAssets(projectId);
    }

    if (tab === 'bindings' || tab === 'diagnostics') {
      void loadProjectBindings(projectId);
    }
  };

  const handleAutoFillFormat = (projectId: string) => {
    const draft = drafts[projectId];
    if (!draft) return;

    const inferred = inferFormatFromUrl(draft.threeDModelUrl);
    if (!inferred) return;

    setDrafts((prev) => ({
      ...prev,
      [projectId]: {
        ...draft,
        threeDModelFormat: inferred,
      },
    }));
  };

  const handleSaveRuntime = async (project: StudioProject) => {
    const draft = drafts[project.id] ?? getInitialDraft(project);

    try {
      setDrafts((prev) => ({
        ...prev,
        [project.id]: {
          ...draft,
          saving: true,
          message: null,
        },
      }));

      const payload: UpdateProject3DPayload = {
        threeDModelUrl: draft.threeDModelUrl.trim() || null,
        threeDModelFormat: draft.threeDModelFormat.trim() || null,
        threeDPreviewImage: draft.threeDPreviewImage.trim() || null,
      };

      const updated = await updateProject3D(project.id, payload);

      setProjects((prev) =>
        prev.map((item) =>
          item.id === project.id ? { ...item, ...updated } : item,
        ),
      );

      setDrafts((prev) => ({
        ...prev,
        [project.id]: {
          ...getInitialDraft({ ...project, ...updated }),
          saving: false,
          uploadingModel: false,
          message: 'Runtime-настройки сохранены',
        },
      }));

      window.setTimeout(() => {
        setDrafts((prev) => ({
          ...prev,
          [project.id]: {
            ...(prev[project.id] ??
              getInitialDraft({ ...project, ...updated })),
            message: null,
          },
        }));
      }, 2200);
    } catch (e) {
      setDrafts((prev) => ({
        ...prev,
        [project.id]: {
          ...draft,
          saving: false,
          message:
            e instanceof Error
              ? e.message
              : 'Ошибка при сохранении 3D-настроек проекта',
        },
      }));
    }
  };

  const handleUploadRuntimeModel = async (
    project: StudioProject,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const draft = drafts[project.id] ?? getInitialDraft(project);

    try {
      setDrafts((prev) => ({
        ...prev,
        [project.id]: {
          ...draft,
          uploadingModel: true,
          message: `Загрузка файла ${file.name}...`,
        },
      }));

      const updated = await uploadProject3DModel(project.id, file);

      setProjects((prev) =>
        prev.map((item) =>
          item.id === project.id ? { ...item, ...updated } : item,
        ),
      );

      setDrafts((prev) => ({
        ...prev,
        [project.id]: {
          threeDModelUrl: updated.threeDModelUrl ?? '',
          threeDModelFormat:
            updated.threeDModelFormat ?? inferFormatFromUrl(file.name),
          threeDPreviewImage:
            draft.threeDPreviewImage || updated.threeDPreviewImage || '',
          saving: false,
          uploadingModel: false,
          message: `Файл ${file.name} загружен в runtime`,
        },
      }));
    } catch (e) {
      setDrafts((prev) => ({
        ...prev,
        [project.id]: {
          ...draft,
          uploadingModel: false,
          message:
            e instanceof Error
              ? e.message
              : 'Не удалось загрузить runtime-модель',
        },
      }));
    }
  };

  const handleCreateAsset = async (projectId: string) => {
    const state = assetsByProject[projectId] ?? createEmptyAssetsState();
    const name = state.createName.trim();

    if (!name) {
      setProjectAssetsState(projectId, {
        actionMessage: 'Введите название draft asset',
      });
      return;
    }

    setProjectAssetsState(projectId, {
      creating: true,
      actionMessage: null,
      error: null,
    });

    try {
      await createProject3DAssetDraft({
        projectId,
        name,
      });

      await loadProjectAssets(projectId, true);

      setProjectAssetsState(projectId, {
        creating: false,
        createName: '',
        actionMessage: 'Draft asset создан',
      });
    } catch (e) {
      setProjectAssetsState(projectId, {
        creating: false,
        actionMessage:
          e instanceof Error ? e.message : 'Не удалось создать draft asset',
      });
    }
  };

  const handleSetAssetReady = async (projectId: string, assetId: string) => {
    setProjectAssetsState(projectId, {
      actionLoadingAssetId: assetId,
      actionMessage: null,
    });

    try {
      await setProject3DAssetStatus(assetId, {
        status: 'READY',
      });

      await loadProjectAssets(projectId, true);

      setProjectAssetsState(projectId, {
        actionLoadingAssetId: null,
        actionMessage: 'Asset переведён в READY',
      });
    } catch (e) {
      setProjectAssetsState(projectId, {
        actionLoadingAssetId: null,
        actionMessage:
          e instanceof Error ? e.message : 'Не удалось обновить статус asset',
      });
    }
  };

  const handleArchiveAsset = async (projectId: string, assetId: string) => {
    setProjectAssetsState(projectId, {
      actionLoadingAssetId: assetId,
      actionMessage: null,
    });

    try {
      await setProject3DAssetStatus(assetId, {
        status: 'ARCHIVED',
      });

      await loadProjectAssets(projectId, true);

      setProjectAssetsState(projectId, {
        actionLoadingAssetId: null,
        actionMessage: 'Asset отправлен в архив',
      });
    } catch (e) {
      setProjectAssetsState(projectId, {
        actionLoadingAssetId: null,
        actionMessage:
          e instanceof Error ? e.message : 'Не удалось архивировать asset',
      });
    }
  };

  const handlePublishAssetToViewer = async (
    projectId: string,
    assetId: string,
  ) => {
    const currentProject = projects.find((p) => p.id === projectId);
    if (!currentProject) return;

    setProjectAssetsState(projectId, {
      actionLoadingAssetId: assetId,
      publishToViewerLoading: true,
      actionMessage: null,
    });

    try {
      await publishProject3DAsset(assetId);
      const runtimeProject = await publishResolvedProject3D(projectId);

      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? {
                ...project,
                ...runtimeProject,
                published3DAssetId: assetId,
              }
            : project,
        ),
      );

      setDrafts((prev) => ({
        ...prev,
        [projectId]: {
          ...(prev[projectId] ?? getInitialDraft(currentProject)),
          threeDModelUrl: runtimeProject.threeDModelUrl ?? '',
          threeDModelFormat: runtimeProject.threeDModelFormat ?? '',
          threeDPreviewImage: runtimeProject.threeDPreviewImage ?? '',
          message: 'Published asset применён в runtime Viewer',
          saving: false,
          uploadingModel: false,
        },
      }));

      await loadProjectAssets(projectId, true);

      setProjectAssetsState(projectId, {
        actionLoadingAssetId: null,
        publishToViewerLoading: false,
        actionMessage: 'Asset опубликован и подтянут в Viewer',
      });
    } catch (e) {
      setProjectAssetsState(projectId, {
        actionLoadingAssetId: null,
        publishToViewerLoading: false,
        actionMessage:
          e instanceof Error
            ? e.message
            : 'Не удалось опубликовать asset в Viewer',
      });
    }
  };

  if (loading && !projects.length) {
    return (
      <div style={{ padding: 24, color: 'var(--nh-text-main)' }}>
        Загрузка 3D-проектов...
      </div>
    );
  }

  if (error && !projects.length) {
    return (
      <div style={{ padding: 24, color: 'var(--nh-danger)' }}>
        Ошибка: {error}
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div style={{ padding: 24, color: 'var(--nh-text-main)' }}>
        Проектов пока нет.
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <header style={{ margin: '4px 0 16px' }}>
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            opacity: 0.6,
            color: 'var(--nh-text-muted)',
          }}
        >
          Hidden 3D workspace
        </div>
        <h1
          style={{
            margin: '4px 0 4px',
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 0.2,
          }}
        >
          3D Projects Studio
        </h1>
        <div
          style={{
            fontSize: 13,
            opacity: 0.84,
            color: 'var(--nh-text-muted)',
            lineHeight: 1.55,
            maxWidth: 980,
          }}
        >
          Вся power-логика осталась внутри, но теперь она разложена по
          разделам: overview, runtime, assets, bindings и diagnostics.
          Это studio для настройки 3D-проектов, а не свалка из блоков.
        </div>
      </header>

      <section style={heroCard}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <div style={metricCard}>
            <div style={{ fontSize: 11, opacity: 0.65 }}>Проекты</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.totalProjects}
            </div>
            <div style={{ fontSize: 11, color: 'var(--nh-text-muted)' }}>
              всего в 3D-слое
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 11, opacity: 0.65 }}>С runtime моделью</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.projectsWithModel}
            </div>
            <div style={{ fontSize: 11, color: 'var(--nh-text-muted)' }}>
              viewer-ready runtime
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 11, opacity: 0.65 }}>С превью</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.projectsWithPreview}
            </div>
            <div style={{ fontSize: 11, color: 'var(--nh-text-muted)' }}>
              presentation preview
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 11, opacity: 0.65 }}>Всего юнитов</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.totalUnits}
            </div>
            <div style={{ fontSize: 11, color: 'var(--nh-text-muted)' }}>
              в 3D-проектах
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 11, opacity: 0.65 }}>Привязано</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.linkedUnits}
            </div>
            <div style={{ fontSize: 11, color: 'var(--nh-text-muted)' }}>
              mesh binding ready
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 11, opacity: 0.65 }}>Без привязки</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.unlinkedUnits}
            </div>
            <div style={{ fontSize: 11, color: 'var(--nh-text-muted)' }}>
              требуют доработки
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 11, opacity: 0.65 }}>
              Всего asset records
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.totalAssets}
            </div>
            <div style={{ fontSize: 11, color: 'var(--nh-text-muted)' }}>
              draft / ready / published
            </div>
          </div>

          <div style={metricCard}>
            <div style={{ fontSize: 11, opacity: 0.65 }}>Published assets</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.publishedAssets}
            </div>
            <div style={{ fontSize: 11, color: 'var(--nh-text-muted)' }}>
              активные публикации
            </div>
          </div>
        </div>
      </section>

      <section style={sectionCard}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: 900 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              Studio search & refresh
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--nh-text-muted)',
                lineHeight: 1.55,
              }}
            >
              Поиск теперь помогает быстро найти нужный проект по названию,
              адресу, URL и runtime-данным. Список остаётся подробным, но не
              выглядит как техсвалка.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по проекту, адресу, URL, формату..."
              style={{
                ...inputStyle,
                minWidth: 320,
              }}
            />

            <button type="button" onClick={() => void refreshAll()} style={ghostBtn}>
              Обновить
            </button>
          </div>
        </div>

        {unitsLoading && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: 'var(--nh-text-muted)',
            }}
          >
            Диагностика юнитов обновляется...
          </div>
        )}

        {unitsError && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: 'var(--nh-danger)',
            }}
          >
            Ошибка диагностики юнитов: {unitsError}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: 'var(--nh-danger)',
            }}
          >
            Ошибка списка проектов: {error}
          </div>
        )}
      </section>

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {filteredProjects.map((project) => {
          const draft = drafts[project.id] ?? getInitialDraft(project);
          const projectUnits = unitsByProject[project.id] ?? [];
          const bindingsState =
            bindingsByProject[project.id] ?? createEmptyBindingsState();

          const linkedUnits = projectUnits.filter((unit) =>
            Boolean(getBindingKey(unit, bindingsState)),
          ).length;
          const unlinkedUnits = Math.max(projectUnits.length - linkedUnits, 0);

          const hasModel = !!draft.threeDModelUrl.trim();
          const hasPreview = !!draft.threeDPreviewImage.trim();
          const inferredFormat = inferFormatFromUrl(draft.threeDModelUrl);
          const explicitFormat = draft.threeDModelFormat.trim();
          const effectiveFormat = explicitFormat || inferredFormat;
          const hasUnits = projectUnits.length > 0;
          const bindingCoverage =
            projectUnits.length > 0
              ? (linkedUnits / projectUnits.length) * 100
              : 0;

          const readyForViewer =
            hasModel && hasUnits && linkedUnits > 0 && unlinkedUnits === 0;

          const assetsState =
            assetsByProject[project.id] ?? createEmptyAssetsState();
          const publishedAsset =
            assetsState.items.find((asset) => asset.isPublished) ?? null;
          const currentTab = activeTab[project.id] ?? 'overview';

          return (
            <section key={project.id} style={sectionCard}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(240px, 0.8fr)',
                  gap: 16,
                  alignItems: 'start',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                      }}
                    >
                      {project.name}
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        padding: '4px 9px',
                        borderRadius: 999,
                        background: hasModel
                          ? 'rgba(34,197,94,0.12)'
                          : 'rgba(148,163,184,0.18)',
                        color: hasModel ? '#166534' : 'var(--nh-text-muted)',
                      }}
                    >
                      {hasModel ? 'Runtime ready' : 'Runtime missing'}
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        padding: '4px 9px',
                        borderRadius: 999,
                        background: publishedAsset
                          ? 'rgba(59,130,246,0.12)'
                          : 'rgba(148,163,184,0.18)',
                        color: publishedAsset ? '#1d4ed8' : 'var(--nh-text-muted)',
                      }}
                    >
                      {publishedAsset
                        ? 'Published asset assigned'
                        : 'No published asset'}
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        padding: '4px 9px',
                        borderRadius: 999,
                        background: readyForViewer
                          ? 'rgba(34,197,94,0.12)'
                          : 'rgba(250,204,21,0.18)',
                        color: readyForViewer ? '#166534' : '#92400e',
                      }}
                    >
                      {readyForViewer ? 'Готов к Viewer' : 'Не готов к Viewer'}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--nh-text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    {getProjectAddress(project) || 'Адрес не указан'}
                  </div>

                  {project.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--nh-text-muted)',
                        lineHeight: 1.55,
                        maxWidth: 860,
                      }}
                    >
                      {project.description}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 10,
                  }}
                >
                  <div style={subtleCard}>
                    <div style={{ fontSize: 11, opacity: 0.65 }}>Юниты</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {projectUnits.length}
                    </div>
                  </div>

                  <div style={subtleCard}>
                    <div style={{ fontSize: 11, opacity: 0.65 }}>Binding</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {formatPercent(bindingCoverage)}
                    </div>
                  </div>

                  <div style={subtleCard}>
                    <div style={{ fontSize: 11, opacity: 0.65 }}>Assets</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {assetsState.items.length}
                    </div>
                  </div>

                  <div style={subtleCard}>
                    <div style={{ fontSize: 11, opacity: 0.65 }}>Формат</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {effectiveFormat || '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {TABS.map((tab) => {
                    const active = currentTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => openProjectTab(project.id, tab.key)}
                        style={{
                          ...ghostBtn,
                          background: active
                            ? 'rgba(34,197,94,0.12)'
                            : 'var(--nh-bg-main)',
                          borderColor: active
                            ? 'rgba(34,197,94,0.28)'
                            : 'var(--nh-border-subtle)',
                          color: active ? '#166534' : 'var(--nh-text-main)',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <a
                    href={`/viewer?projectId=${encodeURIComponent(project.id)}`}
                    style={{
                      ...ghostBtn,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Открыть Viewer
                  </a>

                  <button
                    type="button"
                    onClick={() => toggleExpanded(project.id)}
                    style={ghostBtn}
                  >
                    {expanded[project.id] ? 'Свернуть студию' : 'Открыть студию'}
                  </button>
                </div>
              </div>

              {!expanded[project.id] ? null : (
                <div style={{ marginTop: 14 }}>
                  {currentTab === 'overview' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(280px, 360px) minmax(0, 1fr) minmax(240px, 300px)',
                        gap: 14,
                      }}
                    >
                      <div style={panelCard}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            marginBottom: 12,
                          }}
                        >
                          Project preview
                        </div>

                        <div
                          style={{
                            borderRadius: 16,
                            overflow: 'hidden',
                            border: '1px solid var(--nh-border-subtle)',
                            width: '100%',
                            aspectRatio: '16 / 10',
                            background: 'rgba(148,163,184,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {draft.threeDPreviewImage ? (
                            <img
                              src={draft.threeDPreviewImage}
                              alt={project.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              Preview пока не добавлено
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            fontSize: 12,
                            color: 'var(--nh-text-muted)',
                            lineHeight: 1.6,
                          }}
                        >
                          Здесь быстро видно, готов ли проект к презентации:
                          модель, превью, покрытие bindings и published asset.
                        </div>
                      </div>

                      <div style={panelCard}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            marginBottom: 12,
                          }}
                        >
                          Studio status
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 10,
                          }}
                        >
                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Runtime model
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>
                              {hasModel ? 'Есть' : 'Нет'}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              {draft.threeDModelUrl
                                ? draft.threeDModelUrl.split('/').pop()
                                : 'файл не задан'}
                            </div>
                          </div>

                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Preview
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>
                              {hasPreview ? 'Есть' : 'Нет'}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              {hasPreview ? 'готово для презентации' : 'желательно добавить'}
                            </div>
                          </div>

                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Asset layer
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>
                              {assetsState.items.length}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              записей asset
                            </div>
                          </div>

                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Published
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>
                              {publishedAsset ? 'Да' : 'Нет'}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              {publishedAsset ? publishedAsset.name : 'не назначен'}
                            </div>
                          </div>

                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Binding coverage
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>
                              {linkedUnits}/{projectUnits.length || 0}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              {formatPercent(bindingCoverage)}
                            </div>
                          </div>

                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Viewer readiness
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>
                              {readyForViewer ? 'Готово' : 'Не готово'}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              {readyForViewer
                                ? 'можно показывать менеджерам'
                                : 'нужно добить настройки'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={panelCard}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            marginBottom: 12,
                          }}
                        >
                          Quick actions
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => openProjectTab(project.id, 'runtime')}
                            style={saveBtn}
                          >
                            Открыть runtime
                          </button>
                          <button
                            type="button"
                            onClick={() => openProjectTab(project.id, 'assets')}
                            style={ghostBtn}
                          >
                            Открыть assets
                          </button>
                          <button
                            type="button"
                            onClick={() => openProjectTab(project.id, 'bindings')}
                            style={ghostBtn}
                          >
                            Открыть bindings
                          </button>
                          <button
                            type="button"
                            onClick={() => openProjectTab(project.id, 'diagnostics')}
                            style={ghostBtn}
                          >
                            Открыть diagnostics
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentTab === 'runtime' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 0.8fr)',
                        gap: 14,
                      }}
                    >
                      <div style={panelCard}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            marginBottom: 12,
                          }}
                        >
                          Runtime Viewer fields
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: 10,
                          }}
                        >
                          <label style={{ fontSize: 12 }}>
                            URL 3D-модели
                            <input
                              type="text"
                              placeholder="/models/demo-building.glb"
                              value={draft.threeDModelUrl}
                              onChange={(e) =>
                                updateDraftField(
                                  project.id,
                                  'threeDModelUrl',
                                  e.target.value,
                                )
                              }
                              style={{ ...inputStyle, marginTop: 4 }}
                            />
                          </label>

                          <div
                            style={{
                              borderRadius: 14,
                              border: '1px dashed var(--nh-border-subtle)',
                              background: 'var(--nh-bg-elevated)',
                              padding: 12,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                marginBottom: 6,
                              }}
                            >
                              Прямая загрузка runtime-модели
                            </div>

                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                                lineHeight: 1.55,
                                marginBottom: 10,
                              }}
                            >
                              Быстрый upload для GLB / GLTF / OBJ / FBX. Это
                              самый удобный способ быстро подцепить демо-модель
                              и сразу проверить её во Viewer.
                            </div>

                            <input
                              type="file"
                              accept=".obj,.glb,.gltf,.fbx"
                              onChange={(e) =>
                                void handleUploadRuntimeModel(project, e)
                              }
                              disabled={draft.uploadingModel}
                              style={{
                                ...inputStyle,
                                padding: '7px 10px',
                              }}
                            />
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '220px 1fr',
                              gap: 10,
                            }}
                          >
                            <label style={{ fontSize: 12 }}>
                              Формат
                              <input
                                type="text"
                                placeholder="glb"
                                value={draft.threeDModelFormat}
                                onChange={(e) =>
                                  updateDraftField(
                                    project.id,
                                    'threeDModelFormat',
                                    e.target.value,
                                  )
                                }
                                style={{ ...inputStyle, marginTop: 4 }}
                              />
                            </label>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 8,
                                flexWrap: 'wrap',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleAutoFillFormat(project.id)}
                                style={ghostBtn}
                              >
                                Автоопределить формат
                              </button>

                              <div
                                style={{
                                  fontSize: 12,
                                  color: 'var(--nh-text-muted)',
                                }}
                              >
                                Из URL сейчас читается: <b>{inferredFormat || '—'}</b>
                              </div>
                            </div>
                          </div>

                          <label style={{ fontSize: 12 }}>
                            URL превью
                            <input
                              type="text"
                              placeholder="/images/building-preview.png"
                              value={draft.threeDPreviewImage}
                              onChange={(e) =>
                                updateDraftField(
                                  project.id,
                                  'threeDPreviewImage',
                                  e.target.value,
                                )
                              }
                              style={{ ...inputStyle, marginTop: 4 }}
                            />
                          </label>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleSaveRuntime(project)}
                            disabled={draft.saving || draft.uploadingModel}
                            style={{
                              ...saveBtn,
                              opacity: draft.saving || draft.uploadingModel ? 0.7 : 1,
                              cursor:
                                draft.saving || draft.uploadingModel
                                  ? 'default'
                                  : 'pointer',
                            }}
                          >
                            {draft.saving
                              ? 'Сохранение…'
                              : draft.uploadingModel
                              ? 'Загрузка модели…'
                              : 'Сохранить runtime'}
                          </button>

                          <a
                            href={`/viewer?projectId=${encodeURIComponent(project.id)}`}
                            style={{
                              ...ghostBtn,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            Открыть Viewer
                          </a>

                          {draft.message && (
                            <span
                              style={{
                                fontSize: 12,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              {draft.message}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={panelCard}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            marginBottom: 12,
                          }}
                        >
                          Runtime snapshot
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gap: 10,
                          }}
                        >
                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Модель
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12 }}>
                              {draft.threeDModelUrl || 'Не задана'}
                            </div>
                          </div>

                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Формат
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12 }}>
                              {effectiveFormat || 'Не определён'}
                            </div>
                          </div>

                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Preview URL
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12 }}>
                              {draft.threeDPreviewImage || 'Не задан'}
                            </div>
                          </div>

                          {draft.threeDPreviewImage && (
                            <div
                              style={{
                                borderRadius: 14,
                                overflow: 'hidden',
                                border: '1px solid var(--nh-border-subtle)',
                                width: '100%',
                                aspectRatio: '16 / 10',
                                background: 'rgba(148,163,184,0.08)',
                              }}
                            >
                              <img
                                src={draft.threeDPreviewImage}
                                alt={project.name}
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
                      </div>
                    </div>
                  )}

                  {currentTab === 'assets' && (
                    <div style={panelCard}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          marginBottom: 12,
                        }}
                      >
                        Asset / Publish layer
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          marginBottom: 10,
                        }}
                      >
                        <input
                          type="text"
                          value={assetsState.createName}
                          onChange={(e) =>
                            setProjectAssetsState(project.id, {
                              createName: e.target.value,
                            })
                          }
                          placeholder="Название нового draft asset"
                          style={{
                            ...inputStyle,
                            minWidth: 220,
                            flex: '1 1 auto',
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => void handleCreateAsset(project.id)}
                          disabled={assetsState.creating}
                          style={{
                            ...saveBtn,
                            opacity: assetsState.creating ? 0.7 : 1,
                            cursor: assetsState.creating ? 'default' : 'pointer',
                          }}
                        >
                          {assetsState.creating ? 'Создание…' : 'Создать asset'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void loadProjectAssets(project.id, true)}
                          disabled={assetsState.loading}
                          style={ghostBtn}
                        >
                          {assetsState.loading ? 'Обновление…' : 'Обновить assets'}
                        </button>
                      </div>

                      {assetsState.error && (
                        <div
                          style={{
                            marginBottom: 10,
                            fontSize: 12,
                            color: 'var(--nh-danger)',
                          }}
                        >
                          {assetsState.error}
                        </div>
                      )}

                      {assetsState.actionMessage && (
                        <div
                          style={{
                            marginBottom: 10,
                            fontSize: 12,
                            color: 'var(--nh-text-muted)',
                          }}
                        >
                          {assetsState.actionMessage}
                        </div>
                      )}

                      {assetsState.items.length === 0 ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--nh-text-muted)',
                            lineHeight: 1.55,
                          }}
                        >
                          Для проекта пока нет asset records. Создай draft asset,
                          затем через pipeline можно будет привязать
                          source/output/preview файлы.
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            maxHeight: 520,
                            overflowY: 'auto',
                            paddingRight: 4,
                          }}
                        >
                          {assetsState.items.map((asset) => {
                            const statusMeta = getAssetStateLabel(asset);
                            const busy =
                              assetsState.actionLoadingAssetId === asset.id ||
                              assetsState.publishToViewerLoading;

                            const assetNotes = getAssetNotes(asset);
                            const assetDiagnostics = getAssetDiagnostics(asset);
                            const hasAssetNotes = Boolean(assetNotes);
                            const hasAssetDiagnostics =
                              hasUnknownValue(assetDiagnostics);

                            return (
                              <div
                                key={asset.id}
                                style={{
                                  borderRadius: 14,
                                  border: asset.isPublished
                                    ? '1px solid rgba(59,130,246,0.35)'
                                    : '1px solid var(--nh-border-subtle)',
                                  background: 'var(--nh-bg-elevated)',
                                  padding: 12,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    alignItems: 'flex-start',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <div style={{ maxWidth: 760 }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 800,
                                        }}
                                      >
                                        {asset.name}
                                      </div>

                                      <span
                                        style={{
                                          fontSize: 10,
                                          padding: '3px 8px',
                                          borderRadius: 999,
                                          background: statusMeta.bg,
                                          color: statusMeta.color,
                                        }}
                                      >
                                        {statusMeta.label}
                                      </span>

                                      {asset.isPublished && (
                                        <span
                                          style={{
                                            fontSize: 10,
                                            padding: '3px 8px',
                                            borderRadius: 999,
                                            background: 'rgba(59,130,246,0.12)',
                                            color: '#1d4ed8',
                                          }}
                                        >
                                          Active publish
                                        </span>
                                      )}
                                    </div>

                                    <div
                                      style={{
                                        marginTop: 4,
                                        fontSize: 11,
                                        color: 'var(--nh-text-muted)',
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      {asset.versionLabel
                                        ? `Версия: ${asset.versionLabel} · `
                                        : ''}
                                      source: {asset.sourceFormat || '—'} · output:{' '}
                                      {asset.outputFormat || '—'}
                                    </div>

                                    <div
                                      style={{
                                        marginTop: 4,
                                        fontSize: 11,
                                        color: 'var(--nh-text-muted)',
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      source file:{' '}
                                      <b>{asset.sourceFile?.originalName || 'не привязан'}</b>
                                      {' · '}
                                      output file:{' '}
                                      <b>{asset.outputFile?.originalName || 'не привязан'}</b>
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: 8,
                                      flexWrap: 'wrap',
                                      justifyContent: 'flex-end',
                                    }}
                                  >
                                    {!asset.isPublished && asset.status !== 'READY' && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleSetAssetReady(project.id, asset.id)
                                        }
                                        disabled={busy}
                                        style={ghostBtn}
                                      >
                                        READY
                                      </button>
                                    )}

                                    {!asset.isPublished && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handlePublishAssetToViewer(
                                            project.id,
                                            asset.id,
                                          )
                                        }
                                        disabled={busy}
                                        style={saveBtn}
                                      >
                                        Publish to Viewer
                                      </button>
                                    )}

                                    {asset.status !== 'ARCHIVED' && !asset.isPublished && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleArchiveAsset(project.id, asset.id)
                                        }
                                        disabled={busy}
                                        style={ghostBtn}
                                      >
                                        Archive
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {(hasAssetNotes || hasAssetDiagnostics) && (
                                  <div
                                    style={{
                                      marginTop: 8,
                                      fontSize: 11,
                                      color: 'var(--nh-text-muted)',
                                      lineHeight: 1.55,
                                    }}
                                  >
                                    {hasAssetNotes && <div>notes: {assetNotes}</div>}
                                    {hasAssetDiagnostics && (
                                      <div>diagnostics: attached</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {currentTab === 'bindings' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.8fr)',
                        gap: 14,
                      }}
                    >
                      <div style={panelCard}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                            }}
                          >
                            Project bindings
                          </div>

                          <button
                            type="button"
                            onClick={() => void loadProjectBindings(project.id, true)}
                            style={ghostBtn}
                          >
                            Обновить bindings
                          </button>
                        </div>

                        {bindingsState.error && (
                          <div
                            style={{
                              marginBottom: 10,
                              fontSize: 12,
                              color: 'var(--nh-danger)',
                            }}
                          >
                            {bindingsState.error}
                          </div>
                        )}

                        {bindingsState.loading && (
                          <div
                            style={{
                              marginBottom: 10,
                              fontSize: 12,
                              color: 'var(--nh-text-muted)',
                            }}
                          >
                            Загрузка bindings...
                          </div>
                        )}

                        {bindingsState.items.length === 0 ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--nh-text-muted)',
                              lineHeight: 1.55,
                            }}
                          >
                            Пока нет project-level bindings. Viewer будет
                            fallback’иться на <b>unit.modelElementKey</b>.
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              maxHeight: 500,
                              overflowY: 'auto',
                              paddingRight: 4,
                            }}
                          >
                            {bindingsState.items.map((binding) => (
                              <div
                                key={binding.id}
                                style={{
                                  ...subtleCard,
                                  background: 'var(--nh-bg-elevated)',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 800,
                                    }}
                                  >
                                    {getBindingTargetLabel(binding)}
                                  </div>

                                  {binding.isPrimary && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        padding: '3px 8px',
                                        borderRadius: 999,
                                        background: 'rgba(34,197,94,0.12)',
                                        color: '#166534',
                                      }}
                                    >
                                      Primary
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={{
                                    marginTop: 6,
                                    fontSize: 11,
                                    color: 'var(--nh-text-muted)',
                                    lineHeight: 1.55,
                                  }}
                                >
                                  nodeKey: <b>{binding.nodeKey}</b>
                                  {binding.nodeName ? ` · nodeName: ${binding.nodeName}` : ''}
                                  {binding.nodePath ? ` · nodePath: ${binding.nodePath}` : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={panelCard}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            marginBottom: 12,
                          }}
                        >
                          Unit binding coverage
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gap: 10,
                          }}
                        >
                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Привязано
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>
                              {linkedUnits}/{projectUnits.length || 0}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              покрытие {formatPercent(bindingCoverage)}
                            </div>
                          </div>

                          <div style={subtleCard}>
                            <div style={{ fontSize: 11, opacity: 0.65 }}>
                              Без привязки
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>
                              {unlinkedUnits}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: 'var(--nh-text-muted)',
                              }}
                            >
                              viewer пока не сможет выделять их правильно
                            </div>
                          </div>

                          <div
                            style={{
                              ...subtleCard,
                              maxHeight: 320,
                              overflowY: 'auto',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                marginBottom: 8,
                              }}
                            >
                              Проблемные юниты
                            </div>

                            {projectUnits.filter((unit) => !getBindingKey(unit, bindingsState))
                              .length === 0 ? (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: 'var(--nh-text-muted)',
                                }}
                              >
                                Все юниты проекта имеют binding key.
                              </div>
                            ) : (
                              projectUnits
                                .filter((unit) => !getBindingKey(unit, bindingsState))
                                .slice(0, 20)
                                .map((unit) => (
                                  <div
                                    key={unit.id}
                                    style={{
                                      fontSize: 11,
                                      color: 'var(--nh-text-muted)',
                                      lineHeight: 1.55,
                                      padding: '5px 0',
                                      borderTop: '1px solid rgba(148,163,184,0.12)',
                                    }}
                                  >
                                    {unit.number || unit.id}
                                    {unit.buildingId ? ` · building ${unit.buildingId}` : ''}
                                    {unit.floorId ? ` · floor ${unit.floorId}` : ''}
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentTab === 'diagnostics' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.8fr)',
                        gap: 14,
                      }}
                    >
                      <div style={panelCard}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            marginBottom: 12,
                          }}
                        >
                          Diagnostics checklist
                        </div>

                        <div
                          style={{
                            borderRadius: 14,
                            padding: 12,
                            border: '1px solid var(--nh-border-subtle)',
                            background: 'var(--nh-bg-elevated)',
                            fontSize: 12,
                            lineHeight: 1.7,
                          }}
                        >
                          <div>
                            1. Runtime model:{' '}
                            <b>{hasModel ? 'ok' : 'нужно задать runtime URL'}</b>
                          </div>
                          <div>
                            2. Формат:{' '}
                            <b>
                              {effectiveFormat
                                ? `ok (${effectiveFormat})`
                                : 'нужно указать или определить'}
                            </b>
                          </div>
                          <div>
                            3. Preview:{' '}
                            <b>{hasPreview ? 'ok' : 'желательно добавить'}</b>
                          </div>
                          <div>
                            4. Assets:{' '}
                            <b>
                              {assetsState.items.length > 0
                                ? `${assetsState.items.length} найдено`
                                : 'ещё нет draft/published assets'}
                            </b>
                          </div>
                          <div>
                            5. Published asset:{' '}
                            <b>{publishedAsset ? publishedAsset.name : 'не назначен'}</b>
                          </div>
                          <div>
                            6. Units:{' '}
                            <b>
                              {hasUnits
                                ? `${projectUnits.length} найдено`
                                : 'в проекте нет юнитов'}
                            </b>
                          </div>
                          <div>
                            7. Mesh binding source:{' '}
                            <b>
                              {bindingsState.loading
                                ? 'loading...'
                                : bindingsState.loaded
                                ? `project-3d-bindings (${bindingsState.items.length})`
                                : 'fallback на unit.modelElementKey'}
                            </b>
                          </div>
                          <div>
                            8. Mesh binding:{' '}
                            <b>
                              {projectUnits.length === 0
                                ? 'нет данных'
                                : unlinkedUnits === 0
                                ? 'полностью готово'
                                : `не привязано ${unlinkedUnits}`}
                            </b>
                          </div>
                          <div>
                            9. Viewer readiness:{' '}
                            <b>{readyForViewer ? 'готово' : 'пока не готово'}</b>
                          </div>
                        </div>
                      </div>

                      <div style={panelCard}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            marginBottom: 12,
                          }}
                        >
                          Recommended next step
                        </div>

                        <div
                          style={{
                            ...subtleCard,
                            lineHeight: 1.6,
                            fontSize: 12,
                          }}
                        >
                          {!hasModel && (
                            <div>Сначала загрузи runtime-модель проекта.</div>
                          )}
                          {hasModel && !hasPreview && (
                            <div>Добавь превью, чтобы проект выглядел презентационно.</div>
                          )}
                          {hasModel && unlinkedUnits > 0 && (
                            <div>Добей bindings, чтобы подсветка юнитов работала как часы.</div>
                          )}
                          {hasModel && assetsState.items.length === 0 && (
                            <div>Создай draft asset, чтобы перейти к publish layer.</div>
                          )}
                          {hasModel &&
                            assetsState.items.length > 0 &&
                            !publishedAsset && (
                              <div>Опубликуй готовый asset в runtime Viewer.</div>
                            )}
                          {readyForViewer && (
                            <div>Проект уже можно использовать для demo/showcase.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default Projects3DPage;
